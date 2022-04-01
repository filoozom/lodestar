import {ReturnTypes, RoutesData, Schema, reqEmpty, ReqSerializers, ReqEmpty, jsonType} from "../utils";

export enum ImportStatus {
  /** Keystore successfully decrypted and imported to keymanager permanent storage */
  imported = "imported",
  /** Keystore's pubkey is already known to the keymanager */
  duplicate = "duplicate",
  /** Any other status different to the above: decrypting error, I/O errors, etc. */
  error = "error",
}

export enum DeletionStatus {
  /** key was active and removed */
  deleted = "deleted",
  /** slashing protection data returned but key was not active */
  not_active = "not_active",
  /** key was not found to be removed, and no slashing data can be returned */
  not_found = "not_found",
  /** unexpected condition meant the key could not be removed (the key was actually found, but we couldn't stop using it) - this would be a sign that making it active elsewhere would almost certainly cause you headaches / slashing conditions etc. */
  error = "error",
}

/**
 * JSON serialized representation of a single keystore in EIP-2335: BLS12-381 Keystore format.
 * ```
 * '{"version":4,"uuid":"9f75a3fa-1e5a-49f9-be3d-f5a19779c6fa","path":"m/12381/3600/0/0/0","pubkey":"0x93247f2209abcacf57b75a51dafae777f9dd38bc7053d1af526f220a7489a6d3a2753e5f3e8b1cfe39b56f43611df74a","crypto":{"kdf":{"function":"pbkdf2","params":{"dklen":32,"c":262144,"prf":"hmac-sha256","salt":"8ff8f22ef522a40f99c6ce07fdcfc1db489d54dfbc6ec35613edf5d836fa1407"},"message":""},"checksum":{"function":"sha256","params":{},"message":"9678a69833d2576e3461dd5fa80f6ac73935ae30d69d07659a709b3cd3eddbe3"},"cipher":{"function":"aes-128-ctr","params":{"iv":"31b69f0ac97261e44141b26aa0da693f"},"message":"e8228bafec4fcbaca3b827e586daad381d53339155b034e5eaae676b715ab05e"}}}'
 * ```
 */
export type KeystoreStr = string;

/**
 * JSON serialized representation of the slash protection data in format defined in EIP-3076: Slashing Protection Interchange Format.
 * ```
 * '{"metadata":{"interchange_format_version":"5","genesis_validators_root":"0xcf8e0d4e9587369b2301d0790347320302cc0943d5a1884560367e8208d920f2"},"data":[{"pubkey":"0x93247f2209abcacf57b75a51dafae777f9dd38bc7053d1af526f220a7489a6d3a2753e5f3e8b1cfe39b56f43611df74a","signed_blocks":[],"signed_attestations":[]}]}'
 * ```
 */
export type SlashingProtectionData = string;

/**
 * The validator's BLS public key, uniquely identifying them. _48-bytes, hex encoded with 0x prefix, case insensitive._
 * ```
 * "0x93247f2209abcacf57b75a51dafae777f9dd38bc7053d1af526f220a7489a6d3a2753e5f3e8b1cfe39b56f43611df74a"
 * ```
 */
export type PubkeyHex = string;

type Statuses<Status> = {
  status: Status;
  message?: string;
}[];

type ImportKeystoresReq = {
  keystores: KeystoreStr[];
  passwords: string[];
  slashingProtection: SlashingProtectionData;
};

type ListKeysResponse = {
  validatingPubkey: PubkeyHex;
  /** The derivation path (if present in the imported keystore) */
  derivationPath?: string;
  /** The key associated with this pubkey cannot be deleted from the API */
  readonly?: boolean;
};

export type Api = {
  /**
   * List all validating pubkeys known to and decrypted by this keymanager binary
   *
   * https://github.com/ethereum/keymanager-APIs/blob/0c975dae2ac6053c8245ebdb6a9f27c2f114f407/keymanager-oapi.yaml
   */
  listKeys(): Promise<{
    data: ListKeysResponse[];
  }>;

  /**
   * Import keystores generated by the Eth2.0 deposit CLI tooling. `passwords[i]` must unlock `keystores[i]`.
   *
   * Users SHOULD send slashing_protection data associated with the imported pubkeys. MUST follow the format defined in
   * EIP-3076: Slashing Protection Interchange Format.
   *
   * @param keystores JSON-encoded keystore files generated with the Launchpad
   * @param passwords Passwords to unlock imported keystore files. `passwords[i]` must unlock `keystores[i]`
   * @param slashingProtection Slashing protection data for some of the keys of `keystores`
   * @returns Status result of each `request.keystores` with same length and order of `request.keystores`
   *
   * https://github.com/ethereum/keymanager-APIs/blob/0c975dae2ac6053c8245ebdb6a9f27c2f114f407/keymanager-oapi.yaml
   */
  importKeystores(
    keystoresStr: KeystoreStr[],
    passwords: string[],
    slashingProtectionStr: SlashingProtectionData
  ): Promise<{
    data: Statuses<ImportStatus>;
  }>;

  /**
   * DELETE must delete all keys from `request.pubkeys` that are known to the keymanager and exist in its
   * persistent storage. Additionally, DELETE must fetch the slashing protection data for the requested keys from
   * persistent storage, which must be retained (and not deleted) after the response has been sent. Therefore in the
   * case of two identical delete requests being made, both will have access to slashing protection data.
   *
   * In a single atomic sequential operation the keymanager must:
   * 1. Guarantee that key(s) can not produce any more signature; only then
   * 2. Delete key(s) and serialize its associated slashing protection data
   *
   * DELETE should never return a 404 response, even if all pubkeys from request.pubkeys have no extant keystores
   * nor slashing protection data.
   *
   * Slashing protection data must only be returned for keys from `request.pubkeys` for which a
   * `deleted` or `not_active` status is returned.
   *
   * @param pubkeys List of public keys to delete.
   * @returns Deletion status of all keys in `request.pubkeys` in the same order.
   *
   * https://github.com/ethereum/keymanager-APIs/blob/0c975dae2ac6053c8245ebdb6a9f27c2f114f407/keymanager-oapi.yaml
   */
  deleteKeystores(
    pubkeysHex: string[]
  ): Promise<{
    data: Statuses<DeletionStatus>;
    slashingProtection: SlashingProtectionData;
  }>;
};

export const routesData: RoutesData<Api> = {
  listKeys: {url: "/eth/v1/keystores", method: "GET"},
  importKeystores: {url: "/eth/v1/keystores", method: "POST"},
  deleteKeystores: {url: "/eth/v1/keystores", method: "DELETE"},
};

export type ReqTypes = {
  listKeys: ReqEmpty;
  importKeystores: {body: ImportKeystoresReq};
  deleteKeystores: {body: {pubkeys: string[]}};
};

export function getReqSerializers(): ReqSerializers<Api, ReqTypes> {
  return {
    listKeys: reqEmpty,
    importKeystores: {
      writeReq: (keystores, passwords, slashingProtection) => ({body: {keystores, passwords, slashingProtection}}),
      parseReq: ({body: {keystores, passwords, slashingProtection}}) => [keystores, passwords, slashingProtection],
      schema: {body: Schema.Object},
    },
    deleteKeystores: {
      writeReq: (pubkeys) => ({body: {pubkeys}}),
      parseReq: ({body: {pubkeys}}) => [pubkeys],
      schema: {body: Schema.Object},
    },
  };
}

/* eslint-disable @typescript-eslint/naming-convention */
export function getReturnTypes(): ReturnTypes<Api> {
  return {
    listKeys: jsonType(),
    importKeystores: jsonType(),
    deleteKeystores: jsonType(),
  };
}