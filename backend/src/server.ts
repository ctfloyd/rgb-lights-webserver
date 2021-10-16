import noble from '@abandonware/noble';
import express from 'express';

async function getRgbHandle(): Promise<noble.Characteristic> {
    return new Promise((resolve) => {
        noble.on('stateChange', async (state) => {
            if (state == 'poweredOn') {
                await noble.startScanningAsync(['1812'], false);
            }
        });

        noble.on('discover', async (periphreal) => {
            await noble.stopScanningAsync();
            await periphreal.connectAsync();
            const { characteristics } = await periphreal.discoverAllServicesAndCharacteristicsAsync();
            for(const characteristic of characteristics) {
                if(characteristic.uuid != 'ffe1') {
                    continue;
               }
                return resolve(characteristic);
            }
        });
    });
}

const headerBytes = [0x7E, 0xFF];
const trailingBytes = [0xFF, 0xEF];
async function colorChange(handle: noble.Characteristic, red: number, green: number, blue: number) {
    //                                        G     R     B
    const buffer = [0x7E, 0xFF, 0x05, 0x03, green, red, blue, 0xFF, 0xEF];
    const data = Buffer.from(buffer);
    await handle.writeAsync(data, true);
}

enum PowerState {
    ON,
    OFF
}
async function powerChange(handle: noble.Characteristic, state: PowerState) {
    const powerByte = state == PowerState.OFF ? 0x00 : 0x01;
    const data = [...headerBytes, 0x04, powerByte, 0xFF, 0xFF, 0xFF, ...trailingBytes];
    await handle.writeAsync(Buffer.from(data), true);
}

async function brightnessChange(handle: noble.Characteristic, brightness: number) {
    const data = [...headerBytes, 0x01, brightness, 0x00, 0xFF, 0xFF, ...trailingBytes];
    await handle.writeAsync(Buffer.from(data), true);
}

function initWebserver(handle: noble.Characteristic) {
    const app = express();
    app.use((req, res, next) => {
        // let allowedOrigins = [];
        // if((process.env.API_OFFLINE || '').toLowerCase() == 'true') {
        //     allowedOrigins = ['http://localhost:8000', 'http://calebfloyd.com:8000'];
        // } else {
        //     allowedOrigins = ['https://sguguest.com', 'https://www.sguguest.com'];
        // }
        // if(allowedOrigins.includes(req.headers.origin || '')) {
        //     res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
        // }

        // res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS, PATCH, DELETE');
        // res.setHeader('Access-Control-Allow-Headers', 'X-Requested-Width,content-type');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Method', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        next();
     });
    app.post('/color', express.json(), async (req, res) => {
        console.log('got hit');
        console.log(req.body);
        const r = req.body.r;
        const g = req.body.g;
        const b = req.body.b;

        res.sendStatus(200);
        await colorChange(handle, r, g, b);
    });
    app.post('/power', express.json(), async (req, res) => {
        console.log(req.body);
        const power = req.body.power;
        if(power != 'off' && power != 'on') {
            return res.sendStatus(400);
        }

        res.sendStatus(200);
        await powerChange(handle, power == 'on' ? PowerState.ON : PowerState.OFF);
    });
    app.post('/brightness', express.json(), async (req, res) => {
        console.log(req.body);
        const brightness = Number(req.body.brightness);
        if(!Number.isInteger(brightness) || brightness > 255 || brightness < 0) {
            return res.sendStatus(400);
        }

        res.sendStatus(200);
        await brightnessChange(handle, brightness);
    });

    return app;
}

async function main() {
    const handle = await getRgbHandle();
    const app = initWebserver(handle);
    app.listen(6942, () => console.log('Server started on port 6942'));
}

main();
