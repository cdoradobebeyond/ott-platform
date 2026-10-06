import * as Keychain from 'react-native-keychain';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

export async function installationId() {
  const service = `tv.umbral.device.${Platform.OS}`;
  const old = await Keychain.getGenericPassword({ service });
  if (old) return old.password;
  const random = uuidv4();
  await Keychain.setGenericPassword('installation', random, { service, accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return random;
}
