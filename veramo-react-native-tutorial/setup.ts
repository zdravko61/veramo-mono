// filename: setup.ts

// imports:
// Core interfaces
import {
  createAgent, DIDResolutionOptions, DIDResolutionResult, IAgentContext, ICredentialPlugin,
  IDataStore,
  IDataStoreORM,
  IDIDManager, IIdentifier,
  IKeyManager,
  IMessageHandler,
  IResolver, TAgent
} from '@veramo/core'

// Core identity manager plugin. This allows you to create and manage DIDs by orchestrating different DID provider packages.
// This implements `IDIDManager`
import { DIDManager } from '@veramo/did-manager'

// Core key manager plugin. DIDs use keys and this key manager is required to know how to work with them.
// This implements `IKeyManager`
import { KeyManager } from '@veramo/key-manager'

// This plugin allows us to create and manage `did:ethr` DIDs. (used by DIDManager)
import { EthrDIDProvider } from '@veramo/did-provider-ethr'

// A key management system that uses a local database to store keys (used by KeyManager)
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'

// Storage plugin using TypeORM to link to a database
import {Entities, KeyStore, DIDStore, migrations, PrivateKeyStore, DataStore, DataStoreORM} from '@veramo/data-store'

// Core DID resolver plugin. This plugin orchestrates different DID resolver drivers to resolve the corresponding DID Documents for the given DIDs.
// This plugin implements `IResolver`
import { DIDResolverPlugin } from '@veramo/did-resolver'

// the did:ethr resolver package
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
// the did:web resolver package
import { getResolver as webDidResolver } from 'web-did-resolver'

// TypeORM is installed with '@veramo/data-store'
import { DataSource } from 'typeorm'
import {
  CoordinateMediationRecipientMessageHandler,
  DIDComm,
  DIDCommHttpTransport,
  DIDCommMessageHandler,
  IDIDComm,
  PickupMediatorMessageHandler, PickupRecipientMessageHandler, RoutingMessageHandler
} from "@veramo/did-comm";
import {AbstractMessageHandler, Message, MessageHandler} from "@veramo/message-handler";
import { WebDIDProvider } from "@veramo/did-provider-web";



import {
  IKey,
  IService,
} from '@veramo/core-types'
import { AbstractIdentifierProvider } from '@veramo/did-manager'
import { _NormalizedVerificationMethod } from '@veramo/utils'
import {
  DIDResolver,
  ParsedDID,
  Resolvable,
  VerificationMethod,
} from 'did-resolver'
import {getResolver, PeerDIDProvider} from "@veramo/did-provider-peer";

// filename: setup.ts

// ... imports

// CONSTANTS
// You will need to get a project ID from infura https://www.infura.io
const INFURA_PROJECT_ID = '3586660d179141e3801c3895de1c2eba'

// This is a raw X25519 private key, provided as an example.
// You can run `npx @veramo/cli config create-secret-key` in a terminal to generate a new key.
// In a production app, this MUST NOT be hardcoded in your source code.
const DB_ENCRYPTION_KEY = '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c'

// filename: setup.ts

// ... imports & CONSTANTS

// DB setup:
let dbConnection = new DataSource({
  type: 'expo',
  driver: require('expo-sqlite'),
  database: 'veramo.sqlite',
  migrations: migrations,
  migrationsRun: true,
  logging: ['error', 'info', 'warn'],
  entities: Entities,
}).initialize()

// filename: src/veramo/setup.ts

// ... imports & CONSTANTS & DB setup

// Veramo agent setup
export class FakeDidProvider extends AbstractIdentifierProvider {
  private defaultKms: string

  constructor({ defaultKms }: { defaultKms: string } = { defaultKms: 'local' }) {
    super()
    this.defaultKms = defaultKms
  }

  async createIdentifier(
      { kms, alias, options }: { kms?: string; alias?: string; options?: any },
      context: IAgentContext<IKeyManager>,
  ): Promise<Omit<IIdentifier, 'provider'>> {
    const key = await context.agent.keyManagerCreate({
      kms: kms || this.defaultKms,
      type: options?.type || 'Secp256k1',
    })

    const identifier: Omit<IIdentifier, 'provider'> = {
      did: 'did:fake:' + alias,
      controllerKeyId: key.kid,
      keys: [key],
      services: [],
    }
    return identifier
  }

  async updateIdentifier(
      args: {
        did: string
        kms?: string | undefined
        alias?: string | undefined
        options?: any
      },
      context: IAgentContext<IKeyManager>,
  ): Promise<IIdentifier> {
    throw new Error('FakeDIDProvider updateIdentifier not supported yet.')
  }

  async deleteIdentifier(identifier: IIdentifier, context: IAgentContext<IKeyManager>): Promise<boolean> {
    for (const { kid } of identifier.keys) {
      await context.agent.keyManagerDelete({ kid })
    }
    return true
  }

  async addKey(
      { identifier, key, options }: { identifier: IIdentifier; key: IKey; options?: any },
      context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    return { success: true }
  }

  async addService(
      { identifier, service, options }: { identifier: IIdentifier; service: IService; options?: any },
      context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    return { success: true }
  }

  async removeKey(
      args: { identifier: IIdentifier; kid: string; options?: any },
      context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    return { success: true }
  }

  async removeService(
      args: { identifier: IIdentifier; id: string; options?: any },
      context: IAgentContext<IKeyManager>,
  ): Promise<any> {
    return { success: true }
  }
}

export class FakeDidResolver {
  getAgent: () => TAgent<IDIDManager>
  private force2020: boolean

  constructor(getAgent: () => TAgent<IDIDManager>, force2020: boolean = false) {
    this.getAgent = getAgent
    this.force2020 = force2020
  }

  resolveFakeDid: DIDResolver = async (
      didUrl: string,
      _parsed: ParsedDID,
      _resolver: Resolvable,
      options: DIDResolutionOptions,
  ): Promise<DIDResolutionResult> => {
    try {
      const contexts = new Set<string>()
      const agent = this.getAgent()
      const identifier = await agent.didManagerGet({ did: _parsed.did })
      const did = _parsed.did
      const verificationMethod: VerificationMethod[] = identifier.keys.map((key) => {
        const vm: _NormalizedVerificationMethod = { ...key, controller: did, id: `${did}#${key.kid}` }
        switch (key.type) {
          case 'Secp256k1':
            vm.type = 'EcdsaSecp256k1VerificationKey2019'
            contexts.add('https://w3id.org/security/v2')
            contexts.add('https://w3id.org/security/suites/secp256k1recovery-2020/v2')
            break
          case 'Ed25519':
            if (this.force2020) {
              vm.type = 'Ed25519VerificationKey2020'
              contexts.add('https://w3id.org/security/suites/ed25519-2020/v1')
            } else {
              vm.type = 'Ed25519VerificationKey2018'
              contexts.add('https://w3id.org/security/suites/ed25519-2018/v1')
            }
            break
          case 'X25519':
            if (this.force2020) {
              vm.type = 'X25519KeyAgreementKey2020'
              contexts.add('https://w3id.org/security/suites/x25519-2020/v1')
            } else {
              vm.type = 'X25519KeyAgreementKey2019'
              contexts.add('https://w3id.org/security/suites/x25519-2019/v1')
            }
            break
          default:
            break
        }
        const { meta, description, kid, ...result } = vm as any
        return result
      })
      const vmIds = verificationMethod.map((vm) => vm.id)
      const service = identifier.services.map((service) => {
        service.id = `${did}#${service.id}`
        delete service.description
        return service
      })


      const didResolution: DIDResolutionResult = {
        didResolutionMetadata: {},
        didDocument: {
          //@ts-ignore
          '@context': ['https://www.w3.org/ns/did/v1', ...contexts],
          id: did,
          service,
          verificationMethod,
          keyAgreement: vmIds,
          authentication: vmIds,
          assertionMethod: vmIds,
        },
        didDocumentMetadata: {},
      }
      return didResolution
    } catch (err: any) {
      return {
        didDocumentMetadata: {},
        didResolutionMetadata: { error: 'invalidDid', message: err.toString() },
        didDocument: null,
      }
    }
  }

  getDidFakeResolver() {
    return { fake: this.resolveFakeDid.bind(this) }
  }
}


// @ts-ignore
// const DIDCommEventSniffer: IEventListener = {
//   eventTypes: ['DIDCommV2Message-sent', 'DIDCommV2Message-received', 'DIDCommV2Message-forwarded'],
//   onEvent: (ev:any) => new Promise<void>(()=> {
//     console.log(ev)
//   })
// }

export let agent: TAgent<IResolver & IKeyManager & IDIDManager & IDIDComm & IMessageHandler & IDataStore>

type IContext = IAgentContext<IDataStore>

export class SaveMessageHandler extends AbstractMessageHandler {
  /**
   * Handles a new packed DIDCommV2 Message (also Alpha support but soon deprecated).
   * - Tests whether raw message is a DIDCommV2 message
   * - Unpacks raw message (JWM/JWE/JWS, or plain JSON).
   * -
   */
  async handle(message: Message, context: IContext): Promise<Message> {
    console.log(message.type)
    if (message.type === 'veramo.io-chat-v1') {
      await context.agent.dataStoreSaveMessage({ message })
    }
    return super.handle(message, context)
  }
}

agent= createAgent<IDIDComm & IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialPlugin & IMessageHandler>({
  plugins: [
    new KeyManager({
      store: new KeyStore(dbConnection),
      kms: {
        local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(DB_ENCRYPTION_KEY))),
      },
    }),
    new DIDManager({
      store: new DIDStore(dbConnection),
      defaultProvider: 'did:web',
      providers: {
        'did:peer': new PeerDIDProvider({ defaultKms: 'local' }),
        'did:fake': new FakeDidProvider(),
        'did:web': new WebDIDProvider({
          defaultKms: 'local',
        }),
        'did:ethr:goerli': new EthrDIDProvider({
          defaultKms: 'local',
          network: 'goerli',
          name: 'goerli',
          rpcUrl: 'https://goerli.infura.io/v3/' + INFURA_PROJECT_ID,
        }),
      },
    }),
    new DIDResolverPlugin({
      peer: getResolver().peer,
        ...new FakeDidResolver(() => agent).getDidFakeResolver(),
        ...ethrDidResolver({ infuraProjectId: INFURA_PROJECT_ID }), // and set it up to support `did:ethr`
        ...webDidResolver(), // and `did:web`
      }),
    new DIDComm([new DIDCommHttpTransport()]),
    new DataStore(dbConnection),
    new DataStoreORM(dbConnection),
    // DIDCommEventSniffer,
    new MessageHandler({
      messageHandlers: [
        new DIDCommMessageHandler(),
        new SaveMessageHandler(),
        new CoordinateMediationRecipientMessageHandler(),
        new PickupRecipientMessageHandler(),
      ],
    }),
  ],
})

