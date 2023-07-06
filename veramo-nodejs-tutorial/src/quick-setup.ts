



import { agent } from './veramo/setup.js'
import 'cross-fetch';
import {IDIDCommMessage} from "@veramo/did-comm";
import {v4} from "uuid";


// @ts-ignore
async function main() {

    const MEDIATE_REQUEST_MESSAGE_TYPE =
        'https://didcomm.org/coordinate-mediation/2.0/mediate-request'

    const identifier = await agent.didManagerGetByAlias({
        alias: 'nodejs',
        provider: 'did:peer'
    })

    function createMediateRequestMessage(
        recipientDidUrl: string,
        mediatorDidUrl: string,
    ): IDIDCommMessage {
        return {
            type: MEDIATE_REQUEST_MESSAGE_TYPE,
            from: recipientDidUrl,
            to: mediatorDidUrl,
            id: v4(),
            return_route: 'all',
            created_time: new Date().toISOString(),
            body: {},
        }
    }

    const message = createMediateRequestMessage(
        identifier.did,
        // 'did:web:dev-didcomm-mediator.herokuapp.com',
        'did:web:dev-vereign-mediator.herokuapp.com'
    )
    // https://dev-vereign-mediator-30758e2648b8.herokuapp.com/

    const stored = await agent?.dataStoreSaveMessage({ message })
    console.log('stored?: ', stored)

    const packedMessage = await agent?.packDIDCommMessage({
        packing: 'authcrypt',
        message,
    })

    // requests mediation, and then message handler adds service to DID
    const result = await agent?.sendDIDCommMessage({
        packedMessage,
        messageId: message.id,
        // recipientDidUrl: 'did:web:dev-didcomm-mediator.herokuapp.com',
        recipientDidUrl:'did:web:dev-vereign-mediator.herokuapp.com'

    })

    console.log('result: ', result)


}

main().catch(console.log)
