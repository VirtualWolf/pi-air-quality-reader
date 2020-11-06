import SerialPort from 'serialport';
import ByteLength from '@serialport/parser-byte-length';

interface AirQualityData {
    pm10_standard: number;
    pm25_standard: number;
    pm100_standard: number;
    pm10_env: number;
    pm25_env: number;
    pm100_env: number;
    particles_3um: number;
    particles_5um: number;
    particles_10um: number;
    particles_25um: number;
    particles_50um: number;
    particles_100um: number;
}

export async function readSensor() {
    const port = new SerialPort('/dev/ttyS0', {
        baudRate: 9600,
        autoOpen: false,
    });

    const parser = port.pipe(new ByteLength({length: 32}));

    return await new Promise((resolve, reject) => {
        port.open();

        let readCount = 1;

        let sensorReadings: AirQualityData[] = [];

        parser.on('data', async (buffer: Buffer) => {
            let data = extractData(buffer);

            if (data) {
                readCount++;
                sensorReadings.push(data);
            }

            if (readCount > 5) {
                port.close();
            }
        });

        port.on('close', () => resolve(calculateAverages(sensorReadings)));

        port.on('error', (err) => reject(err));
    });
}

function calculateAverages(data: AirQualityData[]) {
    return {
        'PM1.0 (standard)': calculateAverage('pm10_standard', data),
        'PM2.5 (standard)': calculateAverage('pm25_standard', data),
        'PM10 (standard)': calculateAverage('pm100_standard', data),
        'PM1.0 (environmental)': calculateAverage('pm10_env', data),
        'PM2.5 (environmental)': calculateAverage('pm25_env', data),
        'PM10 (environmental)': calculateAverage('pm100_env', data),
        '0.3μm particles': calculateAverage('particles_3um', data),
        '0.5μm particles': calculateAverage('particles_5um', data),
        '1.0μm particles': calculateAverage('particles_10um', data),
        '2.5μm particles': calculateAverage('particles_25um', data),
        '5.0μm particles': calculateAverage('particles_50um', data),
        '10μm particles': calculateAverage('particles_100um', data),
    }
}

function calculateAverage(key: keyof AirQualityData, data: AirQualityData[]) {
    const total = data.map(item => item[key]).reduce((total, currentValue) => total + currentValue, 0);

    return Math.round(total / data.length);
}

function extractData(buffer: Buffer) {
    // See page 13 for the data structure:
    // http://www.aqmd.gov/docs/default-source/aq-spec/resources-page/plantower-pms5003-manual_v2-3.pdf
    const data = new Uint8Array(buffer);

    // 66 is 0x42, "Start character 1"
    if (data[0] !== 66) {
        return;
    }

    if (data.length > 200 || data.length < 32) {
        return;
    }

    // 77 is 0x4d, "Start character 2"
    if (data[1] !== 77) {
        return;
    }

    const frame = [];

    for (let i = 4; i + 1 < data.length; i += 2) {
        const f = (data[i] << 8) + data[i + 1];
        frame.push(f);
    }

    const [
        pm10_standard,
        pm25_standard,
        pm100_standard,
        pm10_env,
        pm25_env,
        pm100_env,
        particles_3um,
        particles_5um,
        particles_10um,
        particles_25um,
        particles_50um,
        particles_100um,
        skip,
        checksum
    ] = frame;

    // The checksum value from above should equal all of the individual values added together
    const check = data.slice(0, 30).reduce((a, b) => a + b);

    if (check !== checksum) {
        console.warn(`[${new Date()}] Checksum failed!`);

        return;
    } else {
        return {
            pm10_standard,
            pm25_standard,
            pm100_standard,
            pm10_env,
            pm25_env,
            pm100_env,
            particles_3um,
            particles_5um,
            particles_10um,
            particles_25um,
            particles_50um,
            particles_100um,
        };
    }
}
