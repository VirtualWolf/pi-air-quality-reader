import express from 'express';
import cors from 'cors';
import { Sensor } from './lib/sensor';

const sensor = new Sensor();

const app = express();

app.use(cors());

app.get('/', async (req, res) => {
    return res.json(sensor.getData());
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`Listening on port ${port}`));
