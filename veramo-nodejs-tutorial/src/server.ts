import { agent } from './veramo/setup.js'

// @ts-ignore
import express from "express"

import {MessagingRouter, RequestWithAgentRouter} from "@veramo/remote-server";

// Create an instance of Express
const app = express();

const requestWithAgent = RequestWithAgentRouter({ agent })

app.use(
    '/messaging',
    requestWithAgent,
    MessagingRouter({
        metaData: { type: 'DIDComm', value: 'integration test' },
    }),
)

app.get('/health', (req, res) => {
    res.send({test:'mest'});
});

// Start the server on port 3000
app.listen(3000,"0.0.0.0", () => {
    console.log('Server is running on port 3000');
});
