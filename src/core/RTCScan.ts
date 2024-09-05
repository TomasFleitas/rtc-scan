import WebRTC from 'ewents-rtc';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { generateCode } from '../utils/tools';

type RTCScanCodeCallback<T, V = void> = (value: T) => V;

type Feedback = {
  type: 'error' | 'success';
  message?: string;
};

export type ScanConfig = {
  maxFeedback?: number;
  throttleInterval?: number;
  feedbackDuration?: number;
};

export class RTCScan {
  private ewentsWebRTC: WebRTC;
  private rtcScanPeerId: string;
  private peerId: string;
  private session: string;
  private innerOnIsConnected: RTCScanCodeCallback<boolean>;
  private innerOnIsConnecting: RTCScanCodeCallback<boolean>;
  private isGenerating = false;

  constructor(private clientKey: string, private scanConfig?: ScanConfig) {
    if (!clientKey) {
      throw new Error('Client Key is required.');
    }

    if (scanConfig) {
      this.validateKeys(scanConfig, [
        'maxFeedback',
        'throttleInterval',
        'feedbackDuration',
      ]);
    }

    this.rtcScanPeerId = uuidv4();
    this.ewentsWebRTC = new WebRTC({
      clientKey,
    });
    this.ewentsWebRTC.onCommunicationState((lvl) => {
      if (!!this.scanConfig && ['weak', 'full'].includes(lvl)) {
        this.ewentsWebRTC.sendData({ scanConfig: this.scanConfig });
      }
      this.innerOnIsConnected?.(['weak', 'full'].includes(lvl));
      this.innerOnIsConnecting?.('connecting' === lvl);
    });
  }

  public onIsConnected(callback: RTCScanCodeCallback<boolean>) {
    this.innerOnIsConnected = callback;
  }

  public onIsConnecting(callback: RTCScanCodeCallback<boolean>) {
    this.innerOnIsConnecting = callback;
  }

  public async getConnectionDetail(
    qrPxSize = 300,
  ): Promise<{ qrUrl: string; url: string }> {
    return new Promise(async (resolve, reject) => {
      if (!this.isGenerating) {
        this.isGenerating = true;

        this.ewentsWebRTC.closeConnection();

        this.peerId = uuidv4();

        this.ewentsWebRTC.startConnection(this.peerId, {
          peerId: this.rtcScanPeerId,
        });

        this.session = generateCode();

        const pageUrl = `https://26d9-2a09-bac5-c7-1b9-00-2c-b7.ngrok-free.app/${btoa(
          this.peerId,
        )}/${btoa(this.session)}/${btoa(this.rtcScanPeerId)}/${btoa(
          this.clientKey,
        )}`;

        QRCode.toDataURL(pageUrl, { width: qrPxSize }, (err, url) => {
          this.isGenerating = false;
          if (err) reject(err);
          resolve({ qrUrl: url, url: pageUrl });
        });
      }
    });
  }

  public getSession() {
    return this.session;
  }

  public reConnect() {
    this.ewentsWebRTC.startConnection(this.peerId, {
      peerId: this.rtcScanPeerId,
    });
  }

  public closeConnection() {
    this.ewentsWebRTC.closeConnection();
  }

  public onDataReceived<T = any>(
    callback: RTCScanCodeCallback<T, Feedback | Promise<Feedback>>,
  ) {
    if (!callback) throw new Error('callback is required.');
    this.ewentsWebRTC.onReceiveData(async (data) => {
      const callbackResponse = await callback(data);

      this.validateKeys(callbackResponse, ['type', 'message']);
      this.validateFeedbackTypes(callbackResponse.type);

      this.ewentsWebRTC.sendData({ id: data.id, ...callbackResponse });
    });
  }

  private validateFeedbackTypes(types: Feedback['type']) {
    if (!['error', 'success'].includes(types)) {
      throw new Error("type must be one of these values: 'error' | 'success'");
    }
  }

  private validateKeys(obj?: Feedback | ScanConfig, allowedKeys?: string[]) {
    const keys = Object.keys(obj || {});

    const notAllowed = keys?.filter((key) => !allowedKeys?.includes(key));

    if (notAllowed.length) {
      throw new Error(`Keys not allowed: ${notAllowed.toString()}`);
    }
  }
}
