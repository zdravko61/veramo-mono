import { agent } from './veramo/setup.js'

// @ts-ignore
async function main() {

    const listeningPort = 3000

   // const sender = await agent.didManagerImport({
   //      did: 'did:fake:z6MkgbqNU4uF9NKSz5BqJQ4XKVHuQZYcUZP8pXGsJC8nTHwo',
   //      keys: [
   //          {
   //              type: 'Ed25519',
   //              kid: 'didcomm-senderKey-1',
   //              publicKeyHex: '1fe9b397c196ab33549041b29cf93be29b9f2bdd27322f05844112fad97ff92a',
   //              privateKeyHex:
   //                  'b57103882f7c66512dc96777cbafbeb2d48eca1e7a867f5a17a84e9a6740f7dc1fe9b397c196ab33549041b29cf93be29b9f2bdd27322f05844112fad97ff92a',
   //              kms: 'local',
   //          },
   //      ],
   //      services: [
   //          {
   //              id: 'msg1',
   //              type: 'DIDCommMessaging',
   //              serviceEndpoint: `http://localhost:${listeningPort}/messaging`,
   //          },
   //      ],
   //      provider: 'did:fake',
   //      alias: 'sender',
   //  })
   //
   //  const recipient = await agent.didManagerImport({
   //      did: 'did:fake:z6MkrPhffVLBZpxH7xvKNyD4sRVZeZsNTWJkLdHdgWbfgNu3',
   //      keys: [
   //          {
   //              type: 'Ed25519',
   //              kid: 'didcomm-receiverKey-1',
   //              publicKeyHex: 'b162e405b6485eff8a57932429b192ec4de13c06813e9028a7cdadf0e2703636',
   //              privateKeyHex:
   //                  '19ed9b6949cfd0f9a57e30f0927839a985fa699491886ebcdda6a954d869732ab162e405b6485eff8a57932429b192ec4de13c06813e9028a7cdadf0e2703636',
   //              kms: 'local',
   //          },
   //      ],
   //      services: [
   //          {
   //              id: 'msg2',
   //              type: 'DIDCommMessaging',
   //              serviceEndpoint: `http://localhost:${listeningPort}/messaging`,
   //          },
   //      ],
   //      provider: 'did:fake',
   //      alias: 'receiver',
   //  })


    // await agent.didManagerDelete({
    //    did: "did:fake:z6MkrPhffVLBZpxH7xvKNyD4sRVZeZsNTWJkLdHdgWbfgNu3"
    // })
    //

    const c = await agent.resolveDid({ didUrl: "did:fake:z6MkrPhffVLBZpxH7xvKNyD4sRVZeZsNTWJkLdHdgWbfgNu3" })
    console.log(JSON.stringify(c,null,2))
}

main().catch(console.log)
