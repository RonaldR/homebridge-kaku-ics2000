import {CharacteristicValue, HAPStatus, Logger, PlatformAccessory, Service} from 'homebridge';
import {Hub, SwitchDevice} from 'ics-2000';
import KAKUPlatform from '../KAKUPlatform';

/**
 * This class is a simple KAKU or other zigbee lightbulb / switch connected to your ics 2000. This lightbulb can only turn of and on
 */
export default class LightBulb {
  protected readonly service: Service;
  protected readonly device: SwitchDevice;
  protected readonly deviceId: number;
  protected readonly deviceName: string;
  protected readonly isGroup: boolean;
  protected readonly hub: Hub;
  protected readonly logger: Logger;

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
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.deviceId.toString())
      .setCharacteristic(this.platform.Characteristic.Model, this.device.deviceConfig.modelName);

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
      if (newState !== currentState) {
        await this.platform.queueCommand(() => this.device.turnOnOff(newState, true));
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
      return this.device.getOnStatus();
    } catch (e) {
      this.platform.logger.error(`Error getting state for ${this.deviceName}: ${e}`);
      throw new this.platform.api.hap.HapStatusError(HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}
