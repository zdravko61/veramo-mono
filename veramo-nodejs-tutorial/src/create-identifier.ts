import { agent } from './veramo/setup.js'

// @ts-ignore
async function main() {
  // const identifier = await agent.didManagerCreate({ alias: 'default' })
  // console.log(`New identifier created`)
  // console.log(JSON.stringify(identifier, null, 2))

    const identifier = await agent.didManagerCreate({
        alias: 'nodejs',
        provider: 'did:peer',
        options: {
            num_algo: 2,
            service: {
                id: '1864',
                type: 'Messaging',
                description: 'Post any RAW message here',
                serviceEndpoint: 'http://192.168.1.5:3000/messaging',

            },
        },
    })


  console.log(JSON.stringify(identifier,null,2));

}

main().catch(console.log)
