import { agent } from './veramo/setup.js'
import 'cross-fetch';
import {IDIDCommMessage} from "@veramo/did-comm";
import { v4 } from 'uuid'

// @ts-ignore
async function main() {
    const identifier = await agent.didManagerGetByAlias({
        alias: 'nodejs',
        provider: 'did:peer'
    })

    const receiver = "did:peer:2.Ez6LSjNqMKHcrzN13EsT85m4UccQAHQyG2u2TnUR97JpW7xEC.Vz6Mkt2wob6a7yVciNEEnHBPhtR67yh3W3ZYw93T8mwA3stmT.SeyJpZCI6IjdkZTkzMmJhLWRlYWUtNGFmNy05ZWYxLTM0YTFmYzM3MjhhNyIsInQiOiJkbSIsInMiOiJkaWQ6d2ViOmRldi1kaWRjb21tLW1lZGlhdG9yLmhlcm9rdWFwcC5jb20iLCJkZXNjcmlwdGlvbiI6ImEgRElEQ29tbSBlbmRwb2ludCJ9"

    const message: IDIDCommMessage = {
        type: 'veramo.io-chat-v1',
        to: receiver,
        from: identifier.did,
        id: v4(),
        body: { message: 'hello world111' },
        return_route: 'all'
    }
    const packedMessage = await agent.packDIDCommMessage({
        packing: 'authcrypt',
        message,
    })

    const result = await agent.sendDIDCommMessage({
        messageId: message.id,
        packedMessage,
        recipientDidUrl: receiver
    })
}

main().catch(console.log)
