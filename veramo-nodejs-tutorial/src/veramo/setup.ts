// Core interfaces


// Core identity manager plugin
import { DIDManager } from '@veramo/did-manager'

// Ethr did identity provider
import { EthrDIDProvider } from '@veramo/did-provider-ethr'

// Web did identity provider
import { WebDIDProvider } from '@veramo/did-provider-web'

// Core key manager plugin
import { KeyManager } from '@veramo/key-manager'

// Custom key management system for RN
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'

// W3C Verifiable Credential plugin
import { CredentialPlugin } from '@veramo/credential-w3c'

// Custom resolvers
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { Resolver } from 'did-resolver'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
import { getResolver as webDidResolver } from 'web-did-resolver'

// Storage plugin using TypeOrm
import {
  Entities,
  KeyStore,
  DIDStore,
  IDataStoreORM,
  PrivateKeyStore,
  migrations,
  IDataStore,
  DataStore, DataStoreORM
} from '@veramo/data-store'

// TypeORM is installed with `@veramo/data-store`
import { DataSource } from 'typeorm'
import {DIDComm, DIDCommHttpTransport, DIDCommMessageHandler, IDIDComm} from "@veramo/did-comm";
import {MessageHandler} from "@veramo/message-handler";


// This will be the name for the local sqlite database for demo purposes
const DATABASE_FILE = 'database.sqlite'

// You will need to get a project ID from infura https://www.infura.io
const INFURA_PROJECT_ID = "9acd182356a44ae8bed7c68561005b1d"

// This will be the secret key for the KMS
const KMS_SECRET_KEY =
  '11b574d316903ced6cc3f4787bbcc3047d9c72d1da4d83e36fe714ef785d10c1'

import {
  IAgentContext, ICredentialPlugin,
  IDIDManager,
  IIdentifier,
  IKey,
  IKeyManager, IMessageHandler, IResolver,
  IService,
  TAgent,
} from '@veramo/core-types'
import { AbstractIdentifierProvider } from '@veramo/did-manager'
import { _NormalizedVerificationMethod } from '@veramo/utils'
import {
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
  Resolvable,
  VerificationMethod,
} from 'did-resolver'
import {createAgent} from "@veramo/core";
import {getResolver, PeerDIDProvider} from "@veramo/did-provider-peer";

/**
 * A DID method that uses the information stored by the DID manager to resolve
 */
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
const DIDCommEventSniffer: IEventListener = {
  eventTypes: ['DIDCommV2Message-sent', 'DIDCommV2Message-received', 'DIDCommV2Message-forwarded'],
  onEvent: (ev:any) => new Promise<void>(()=> {
    console.log(ev)
  })
}

  const dbConnection = new DataSource({
    type: 'sqlite',
    database: DATABASE_FILE,
    synchronize: false,
    migrations,
    migrationsRun: true,
    logging: ['error', 'info', 'warn'],
    entities: Entities,
  }).initialize()

export let agent: TAgent<IResolver & IKeyManager & IDIDManager & IDIDComm & IMessageHandler & IDataStore>

   agent= createAgent<IDIDComm & IDIDManager & IKeyManager & IDataStore & IDataStoreORM & IResolver & ICredentialPlugin & IMessageHandler>({
    plugins: [
      DIDCommEventSniffer,
      new KeyManager({
        store: new KeyStore(dbConnection),
        kms: {
          local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(KMS_SECRET_KEY))),
        },
      }),
      new DIDManager({
        store: new DIDStore(dbConnection),
        // defaultProvider: "did:web",
        defaultProvider: 'did:ethr:goerli',
        providers: {
          'did:peer': new PeerDIDProvider({ defaultKms: 'local' }),
          'did:fake': new FakeDidProvider(),
          'did:ethr:goerli': new EthrDIDProvider({
            defaultKms: 'local',
            network: 'goerli',
            rpcUrl: 'https://goerli.infura.io/v3/' + INFURA_PROJECT_ID,
          }),
          'did:web': new WebDIDProvider({
            defaultKms: 'local',
          }),
        },
      }),
      new DIDResolverPlugin({
        resolver: new Resolver({
          peer: getResolver().peer,

          ...new FakeDidResolver(() => agent).getDidFakeResolver(),
          ...ethrDidResolver({ infuraProjectId: INFURA_PROJECT_ID }),
          ...webDidResolver(),
        }),
      }),
      new CredentialPlugin(),
      new DataStore(dbConnection),
      new DataStoreORM(dbConnection),
      new DIDComm([new DIDCommHttpTransport()]),
      new MessageHandler({
        messageHandlers: [
          // @ts-ignore
          new DIDCommMessageHandler(),
        ],
      }),
    ],
  })
