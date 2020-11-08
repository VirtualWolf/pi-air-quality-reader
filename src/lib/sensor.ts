import SerialPort from 'serialport';
import ByteLength from '@serialport/parser-byte-length';
import { DateTime } from 'luxon';

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

export class Sensor {
    private port: SerialPort;
    private parser: any;

    private airQualityData: AirQualityData;
    private batchedReadings: AirQualityData[];
    private readCount: number;

    private latestReadingTimestamp: DateTime;

    constructor() {
        this.port = new SerialPort('/dev/ttyS0', {
            baudRate: 9600,
        });

        this.parser = this.port.pipe(new ByteLength({length: 32}));

        this.airQualityData = {
            pm10_standard: 0,
            pm25_standard: 0,
            pm100_standard: 0,
            pm10_env: 0,
            pm25_env: 0,
            pm100_env: 0,
            particles_3um: 0,
            particles_5um: 0,
            particles_10um: 0,
            particles_25um: 0,
            particles_50um: 0,
            particles_100um: 0,
        };

        this.batchedReadings = [];

        this.readCount = 1;

        this.latestReadingTimestamp = DateTime.local();

        this.parser.on('data', (buffer: Buffer) => {
            const data = this.extractData(buffer);

            if (data) {
                this.readCount++;

                this.readCount <= 10
                    ? this.batchedReadings.push(data)
                    : this.calculateAverages(this.batchedReadings);
            }
        });

        this.port.on('error', (err) => console.error(err));
    }

    getData() {
        return {
            ...this.airQualityData,
            latest: this.latestReadingTimestamp.toFormat('yyyy-MM-dd HH:mm'),
        };
    }

    calculateAverages(data: AirQualityData[]) {
        this.airQualityData = {
            pm10_standard: this.calculateAverage('pm10_standard', data),
            pm25_standard: this.calculateAverage('pm25_standard', data),
            pm100_standard: this.calculateAverage('pm100_standard', data),
            pm10_env: this.calculateAverage('pm10_env', data),
            pm25_env: this.calculateAverage('pm25_env', data),
            pm100_env: this.calculateAverage('pm100_env', data),
            particles_3um: this.calculateAverage('particles_3um', data),
            particles_5um: this.calculateAverage('particles_5um', data),
            particles_10um: this.calculateAverage('particles_10um', data),
            particles_25um: this.calculateAverage('particles_25um', data),
            particles_50um: this.calculateAverage('particles_50um', data),
            particles_100um: this.calculateAverage('particles_100um', data),
        }

        this.latestReadingTimestamp = DateTime.local();

        this.readCount = 1;
    }

    calculateAverage(key: keyof AirQualityData, data: AirQualityData[]) {
        const total = data.map(item => item[key]).reduce((total, currentValue) => total + currentValue, 0);

        return Math.round(total / data.length);
    }

    extractData(buffer: Buffer) {
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

        const frame: number[] = [];

        data.slice(4).forEach((element, index, array) => {
            if (index % 2 === 0) {
                frame.push((array[index] << 8) + array[index + 1])
            }
        });

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
}
