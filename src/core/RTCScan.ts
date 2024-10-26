import WebRTC from 'ewents-rtc';
import QRCode from 'qrcode';
import { generateCode } from '../utils/tools';
import { SCAN_TARGET_PAGE } from '../utils/const';
import { createPayload, getPayload } from '../service/payload';

type RTCScanCodeCallback<T, V = void> = (value: T) => V;

type Feedback = {
  type: 'error' | 'success';
  message?: string;
};

export type ScanConfig = {
  maxFeedback?: number;
  throttleInterval?: number;
  feedbackDuration?: number;
  isAutoReconnect?: boolean;
};

export type SystemConfig = {
  isLog?: boolean;
  allowShortUrl?: boolean;
  shortUrlTTL?: number;
};

export class RTCScan {
  private ewentsWebRTC: WebRTC;
  private rtcScanPeerId: string;
  private peerId: string;
  private session: string;
  private innerOnIsConnected?: RTCScanCodeCallback<boolean> | null;
  private innerOnIsConnecting?: RTCScanCodeCallback<boolean> | null;
  private innerOnSessionId?: RTCScanCodeCallback<string> | null;
  private isGenerating = false;
  private communicationLvl?: string;
  private qrPxSize: number = 300;
  private reconnectBlocked: boolean;

  constructor(
    private clientKey: string,
    private scanConfig?: ScanConfig | null,
    private systemConfig?: SystemConfig | null,
  ) {
    if (!clientKey) {
      throw new Error('Client Key is required.');
    }

    if (scanConfig) {
      this.validateKeys(scanConfig, [
        'maxFeedback',
        'throttleInterval',
        'feedbackDuration',
        'isAutoReconnect',
      ]);
    }

    if (systemConfig) {
      this.validateKeys(systemConfig, [
        'allowShortUrl',
        'shortUrlTTL',
        'isLog',
      ]);
    }

    this.rtcScanPeerId = `${generateCode()}-s`;
    this.ewentsWebRTC = new WebRTC({
      isLog: true,
      clientKey,
    });
    this.ewentsWebRTC.onCommunicationState(lvl => {
      if (!!this.scanConfig && ['weak', 'full'].includes(lvl)) {
        this.ewentsWebRTC.sendData({ scanConfig: this.scanConfig });
      }

      this.innerOnIsConnected?.(['weak', 'full'].includes(lvl));
      this.innerOnIsConnecting?.('connecting' === lvl);

      if (
        this.communicationLvl &&
        lvl === 'none' &&
        this.scanConfig?.isAutoReconnect
      ) {
        this.reConnect();
      }

      this.communicationLvl = lvl;
    });
  }

  public onIsConnected(callback?: RTCScanCodeCallback<boolean> | null) {
    this.innerOnIsConnected = callback;
    this.innerOnIsConnected?.(
      ['weak', 'full'].includes(this.communicationLvl || ''),
    );
  }

  public onIsConnecting(callback?: RTCScanCodeCallback<boolean> | null) {
    this.innerOnIsConnecting = callback;
    this.innerOnIsConnecting?.('connecting' === this.communicationLvl);
  }

  public async getConnectionDetail(
    qrPxSize?: number,
  ): Promise<{ qrImage: string; url: string }> {
    this.qrPxSize = qrPxSize ?? this.qrPxSize;
    return new Promise(async (resolve, reject) => {
      if (!this.isGenerating) {
        this.communicationLvl = undefined;
        this.isGenerating = true;

        this.ewentsWebRTC.closeConnection();

        this.peerId = `${generateCode()}-s`;

        this.ewentsWebRTC.startConnection(this.peerId, {
          peerId: this.rtcScanPeerId,
        });

        this.session = generateCode();
        this.innerOnSessionId?.(this.session);

        const scanUrl = await this.generateUrl();

        try {
          resolve(await this.getQr(scanUrl));
        } catch (error) {
          reject(error);
        }
      }
    });
  }

  public getSession(callback?: RTCScanCodeCallback<string> | null) {
    this.innerOnSessionId = callback;
    return this.session;
  }

  public async reConnect() {
    if (this.reconnectBlocked) {
      this.systemConfig?.isLog &&
        console.log(
          'Reconnect is blocked due to too many attempts. Please wait.',
        );
      return;
    }

    try {
      this.communicationLvl = undefined;
      await this.ewentsWebRTC.startConnection(this.peerId, {
        peerId: this.rtcScanPeerId,
      });
    } catch (error) {
      if (error.code === 1008) {
        this.reconnectBlocked = true;
        setTimeout(() => {
          this.reconnectBlocked = false;
          this.systemConfig?.isLog &&
            console.log('Reconnection is now allowed.');
        }, 60000);
      } else {
        console.log(error);
      }
    }
  }

  public closeConnection() {
    this.communicationLvl = undefined;
    this.ewentsWebRTC.closeConnection();
  }

  public onDataReceived<T = any>(
    callback: RTCScanCodeCallback<
      T,
      Feedback | Promise<Feedback> | undefined | null
    >,
  ) {
    if (!callback) throw new Error('callback is required.');
    this.ewentsWebRTC.onReceiveData(async data => {
      const callbackResponse = await callback(data);

      this.validateKeys(callbackResponse, ['type', 'message']);
      this.validateFeedbackTypes(callbackResponse?.type);

      this.ewentsWebRTC.sendData({ id: data.id, ...(callbackResponse || {}) });
    });
  }

  public async startConnectionWithUrl(url: string, qrPxSize?: number) {
    const parsedUrl = new URL(url);
    const urlSegments = parsedUrl.pathname
      .split('/')
      .filter(segment => segment);

    this.qrPxSize = qrPxSize ?? this.qrPxSize;

    this.closeConnection();

    if (this.systemConfig?.allowShortUrl) {
      const id = urlSegments[0];
      const payload = await getPayload(id);

      if (atob(payload.clientKey) !== this.clientKey) {
        throw new Error('Invalid clientKey.');
      }

      this.peerId = atob(payload.peerId);
      this.rtcScanPeerId = atob(payload.scan);
      this.session = atob(payload.session);

      this.reConnect();

      return this.getQr(`${SCAN_TARGET_PAGE}/${id}`);
    } else {
      const [
        peerIdEncoded,
        sessionEncoded,
        rtcScanPeerIdEncoded,
        clientKeyEncoded,
      ] = urlSegments.slice(-4);

      const peerId = atob(peerIdEncoded);
      const session = atob(sessionEncoded);
      const rtcScanPeerId = atob(rtcScanPeerIdEncoded);
      const clientKey = atob(clientKeyEncoded);

      if (clientKey !== this.clientKey) {
        throw new Error('Invalid clientKey.');
      }

      this.peerId = peerId;
      this.session = session;
      this.rtcScanPeerId = rtcScanPeerId;

      this.reConnect();

      return this.getQr(this.getCommonUrl());
    }
  }

  private async getQr(url: string): Promise<{ url: string; qrImage: string }> {
    return await new Promise((resolve, reject) => {
      QRCode.toDataURL(
        url,
        { width: this.qrPxSize, margin: 2 },
        (err, qrImage) => {
          this.isGenerating = false;
          if (err) reject(err);
          resolve({ qrImage, url });
        },
      );
    });
  }

  private validateFeedbackTypes(types?: Feedback['type']) {
    if (!types) return;

    if (!['error', 'success'].includes(types)) {
      throw new Error("type must be one of these values: 'error' | 'success'");
    }
  }

  private validateKeys(
    obj?: Feedback | ScanConfig | SystemConfig | null,
    allowedKeys?: string[],
  ) {
    const keys = Object.keys(obj || {});

    const notAllowed = keys?.filter(key => !allowedKeys?.includes(key));

    if (notAllowed.length) {
      throw new Error(`Keys not allowed: ${notAllowed.toString()}`);
    }
  }

  private async generateUrl() {
    if (this.systemConfig?.allowShortUrl) {
      const id = await createPayload(
        {
          clientKey: btoa(this.clientKey),
          scan: btoa(this.rtcScanPeerId),
          peerId: btoa(this.peerId),
          session: btoa(this.session),
        },
        this.systemConfig.shortUrlTTL,
      );
      return `${SCAN_TARGET_PAGE}/${id}`;
    } else {
      return this.getCommonUrl();
    }
  }

  private getCommonUrl() {
    return `${SCAN_TARGET_PAGE}/${btoa(this.peerId)}/${btoa(
      this.session,
    )}/${btoa(this.rtcScanPeerId)}/${btoa(this.clientKey)}`;
  }
}
