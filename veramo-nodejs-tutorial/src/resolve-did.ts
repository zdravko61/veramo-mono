

import { agent } from './veramo/setup.js'

// @ts-ignore
async function main() {
    const  did = await agent.resolveDid({didUrl: "did:peer:2.Ez6LSsAKS5GUHiHMsWFGk7kp2frWURX5fk4yHZ3cug3jLpFws.Vz6Mksw6Lwp6z1e4UhgoU7u78psDohFsTXzU9HKNg7bDNwDNr.SeyJpZCI6ImI3OTBjMjUxLTEwYWQtNDA2Ni05ODBkLTJmOTVkOTc0MjY3MiIsInQiOiJkbSIsInMiOiJkaWQ6d2ViOmRldi1kaWRjb21tLW1lZGlhdG9yLmhlcm9rdWFwcC5jb20iLCJkZXNjcmlwdGlvbiI6ImEgRElEQ29tbSBlbmRwb2ludCJ9"})
    console.log(did.didDocument)
}

main().catch(console.log)
