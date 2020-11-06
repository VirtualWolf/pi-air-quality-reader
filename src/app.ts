import express from 'express';
import { readSensor } from './lib/sensor';

const app = express();

app.get('/', async (req, res) => {
    try {
        return res.json(await readSensor());
    } catch (err) {
        console.error(`[${new Date()}] Error from sensor: `, err);

        return res.status(500).json(err);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}`));
