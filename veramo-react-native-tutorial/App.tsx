// shims
import '@sinonjs/text-encoding'
import 'react-native-get-random-values'
import '@ethersproject/shims'
import 'cross-fetch/polyfill'
// filename: App.tsx

import React, { useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, View, Text, Button } from 'react-native'

import { agent } from './setup'
import {DIDResolutionResult, IIdentifier, IMessage} from '@veramo/core'
import {IDIDCommMessage} from "@veramo/did-comm";
import { v4 } from 'uuid'


const STATUS_REQUEST_MESSAGE_TYPE =
    'https://didcomm.org/messagepickup/3.0/status-request'

export const DELIVERY_REQUEST_MESSAGE_TYPE =
    'https://didcomm.org/messagepickup/3.0/delivery-request'

const App = () => {
  const [identifiers, setIdentifiers] = useState<IIdentifier[]>([])
  const [resolutionResult, setResolutionResult] = useState<DIDResolutionResult | undefined>()
  const [messages, setMessages] = useState<IMessage[]>([]);

  // Resolve a DID
  const resolveDID = async (did: string) => {
    const result = await agent.resolveDid({ didUrl: did })
    setResolutionResult(result)
  }

    async function pickup(
        agent: any,
        recipientDidUrl: string,
        mediatorDidUrl: string,
    ): Promise<void> {
        const statusMessage = createStatusRequestMessage(
            recipientDidUrl,
            mediatorDidUrl,
        )

        // console.log("statusMessage: ", statusMessage)
        const packedStatusMessage = await agent.packDIDCommMessage({
            packing: 'authcrypt',
            message: statusMessage,
        })
        // console.log("packedStatusMessage: ", packedStatusMessage)
        await agent.sendDIDCommMessage({
            messageId: statusMessage.id,
            packedMessage: packedStatusMessage,
            recipientDidUrl: mediatorDidUrl,
        })
        // console.log('status: ', status)

        const deliveryMessage = deliveryRequestMessage(
            recipientDidUrl,
            mediatorDidUrl,
        )

        const packedMessage = await agent.packDIDCommMessage({
            packing: 'authcrypt',
            message: deliveryMessage,
        })
        await agent.sendDIDCommMessage({
            messageId: deliveryMessage.id,
            packedMessage,
            recipientDidUrl: mediatorDidUrl,
        })
        // console.log('result: ', result)
    }

    function createStatusRequestMessage(
        recipientDidUrl: string,
        mediatorDidUrl: string,
    ): IDIDCommMessage {
        return {
            id: v4(),
            type: STATUS_REQUEST_MESSAGE_TYPE,
            to: mediatorDidUrl,
            from: recipientDidUrl,
            return_route: 'all',
            body: {},
        }
    }

    function deliveryRequestMessage(
        recipientDidUrl: string,
        mediatorDidUrl: string,
    ): IDIDCommMessage {
        return {
            id: v4(),
            type: DELIVERY_REQUEST_MESSAGE_TYPE,
            to: mediatorDidUrl,
            from: recipientDidUrl,
            return_route: 'all',
            body: { limit: 2 },
        }
    }

    const fetchMessages = async () => {
      const idx = await agent.didManagerGetByAlias({
          alias: 'react-native',
          provider: 'did:peer'
      })
        console.log(idx.did)
        await pickup(agent, idx.did, 'did:web:dev-didcomm-mediator.herokuapp.com')

            const messages = await agent.dataStoreORMGetMessages({
                where: [{ column: 'type', value: ['veramo.io-chat-v1'] }],
                order: [{ column: 'createdAt', direction: 'DESC' }],
            })
        console.log({messages})
    }


    // const MINUTE_MS = 6000
    // useEffect(() => {
    //     const checkMyDIDs = async () => {
    //         if (
    //             agent?.availableMethods().includes('packDIDCommMessage') &&
    //             agent?.availableMethods().includes('sendDIDCommMessage')
    //         ) {
    //             const myDIDs = (await agent?.didManagerFind())
    //                 .filter((did) =>
    //                     did.keys.some(
    //                         (key) => key.type === 'X25519' || key.type === 'Ed25519',
    //                     ),
    //                 )
    //                 .filter((did) =>
    //                     did.services.some((service) => service.type === 'DIDCommMessaging'),
    //                 )
    //
    //             if (myDIDs && myDIDs.length > 0) {
    //                 for (let d in myDIDs) {
    //                     const did = myDIDs[d].did
    //                     console.log('pick up messages for did', did)
    //                     await pickup(agent, did, 'did:web:dev-didcomm-mediator.herokuapp.com')
    //                 }
    //             }
    //         }
    //     }
    //     const interval = setInterval(() => checkMyDIDs(), MINUTE_MS)
    //     return () => clearInterval(interval)
    // }, [agent])
    //


    //
    //
    // useEffect(() => {
    // const fetch = async() => {
    //     console.log('fetching')
    //     const messages = await agent?.dataStoreORMGetMessages({
    //         where: [{ column: 'type', value: ['veramo.io-chat-v1'] }],
    //         order: [{ column: 'createdAt', direction: 'DESC' }],
    //     })
    //
    //     setMessages(messages);
    // }
    //
    //
    //     const interval = setInterval(() => fetch(), MINUTE_MS)
    //     return () => clearInterval(interval)
    // },[messages])
    //

  // Add the new identifier to state
  const createIdentifier = async () => {
     const _id =  await agent.didManagerCreate({
          alias: 'react-native',
          provider: 'did:peer',
          options: {
              num_algo: 2,
              service: {
                  id: v4(),
                  type: 'DIDCommMessaging',
                  serviceEndpoint: 'did:web:dev-didcomm-mediator.herokuapp.com',
                  description: 'a DIDComm endpoint',
              },
          },
      })

    // console.log(JSON.stringify(_id.did, null,2));
    setIdentifiers((s) => s.concat([_id]))
  }

  // Check for existing identifers on load and set them to state
  useEffect(() => {
    const getIdentifiers = async () => {
      const _ids = await agent.didManagerFind()
      // console.log(_ids[0].did)
      setIdentifiers(_ids)

      // Inspect the id object in your debug tool
      // console.log('_ids:', _ids)
    }

    getIdentifiers()
  }, [])

  // @ts-ignore
    return (
    <SafeAreaView>
      <ScrollView>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 30, fontWeight: 'bold' }}>Identifiers</Text>
          <Button onPress={() => createIdentifier()} title={'Create Identifier'} />
            <Button onPress={() => fetchMessages()} title={'fetch messages'} />

            <View style={{ marginBottom: 50, marginTop: 20 }}>
            {identifiers && identifiers.length > 0 ? (
              identifiers.map((id: IIdentifier) => (
                <Button onPress={() => resolveDID(id.did)} title={id.did} key={id.did} />
              ))
            ) : (
              <Text>No identifiers created yet</Text>
            )}
          </View>
          <Text style={{ fontSize: 30, fontWeight: 'bold' }}>Resolved DID document:</Text>
          <View style={{ marginBottom: 50, marginTop: 20 }}>
            {resolutionResult ? (
              <Text>{JSON.stringify(resolutionResult.didDocument, null, 2)}</Text>
            ) : (
              <Text>tap on a DID to resolve it</Text>
            )}
          </View>
            <Text style={{ fontSize: 30, fontWeight: 'bold' }}>DIDCOMM v2 messages:</Text>
            {
                messages && messages.length > 0 ? (
                    messages.map((message) => (
                        //@ts-ignore
                        <Text key={message.id}>{message.data["message"] || ""}</Text>
                    ))
                ) : (
                    <Text>No messages</Text>
                )
            }
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

export default App
