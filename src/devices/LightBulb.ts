import {CharacteristicValue, HAPStatus, Logger, PlatformAccessory, Service} from 'homebridge';
import Hub from '../kaku/Hub';
import KAKUPlatform from '../KAKUPlatform';
import Device from '../kaku/Device';

/**
 * This class is a simple KAKU or other zigbee lightbulb / switch connected to your ics 2000. This lightbulb can only turn of and on
 */
export default class LightBulb {
  protected service: Service;
  protected readonly device: Device;
  protected readonly deviceId: number;
  protected readonly deviceName: string;
  protected readonly isGroup: boolean;
  protected readonly hub: Hub;
  protected readonly logger: Logger;

  // The index the status for on/off is stored and the function to use when you turn a device on/off
  protected onOffCharacteristicFunction = 0;

  constructor(
    protected readonly platform: KAKUPlatform,
    protected readonly accessory: PlatformAccessory,
    protected readonly accessoryType: string = 'Switch',
  ) {
    this.device = accessory.context.device;
    this.deviceName = accessory.context.name;
    this.deviceId = this.device.entityId;
    this.isGroup = this.device.isGroup;

    this.hub = platform.hub;
    this.logger = platform.logger;
    this.logger.debug(`${this.deviceName} ${this.accessoryType}`);
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Klik Aan Klik Uit')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceId.toString());

    this.service = this.accessory.getService(this.platform.Service[accessoryType]) ||
      this.accessory.addService(this.platform.Service[accessoryType]);

    this.service.getCharacteristic(this.platform.Characteristic.On)
      .onSet(this.setOn.bind(this))
      .onGet(this.getOn.bind(this));
  }

  public async setOn(newValue: CharacteristicValue) {
    try {
      const newState = newValue as boolean;
      const currentState = this.service.getCharacteristic(this.platform.Characteristic.On).value;

      // Only send a command to the ics-2000 if the state is changed
      // The is necessary, otherwise dimming a light doesn't work because HomeKit sends an on command and a dim command at the same time
      // And the ics-2000 can't handle multiple messages received at the same time
      if (newState !== currentState) {
        // await this.hub.turnDeviceOnOff(this.deviceId, newValue as boolean, this.onOffCharacteristicFunction, this.isGroup, true);
        await this.device.turnOnOff(newValue as boolean, true);
        this.platform.logger.debug(`Changed state to ${newValue} on ${this.deviceName}`);
      }
    } catch (e) {
      this.platform.logger.error(`Error changing state for ${this.deviceName}: ${e}`);
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  public async getOn() {
    try {
      // Get status for this device
      // const statusList = await this.hub.getDeviceStatus(this.deviceId);
      // this.logger.debug(`${this.deviceName} stat ${statusList}`);
      // const status = statusList[this.onOffCharacteristicFunction];
      // this.platform.logger.debug(`Current state for ${this.deviceName}: ${status}`);
      return this.device.getOnStatus();

      // return status === 1;
    } catch (e) {
      this.platform.logger.error(`Error getting state for ${this.deviceName}: ${e}`);
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}
