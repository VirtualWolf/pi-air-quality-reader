const SerialPort = require('serialport');
const ByteLength = require('@serialport/parser-byte-length')

const port = new SerialPort('/dev/ttyS0', {
    baudRate: 9600,
});

const parser = port.pipe(new ByteLength({length: 32}));

parser.on('data', function(buffer) {
    // See page 13 for the data structure:
    // http://www.aqmd.gov/docs/default-source/aq-spec/resources-page/plantower-pms5003-manual_v2-3.pdf
    const data = new Uint8Array(buffer);

    // 66 = 0x42
    if (data[0] !== 66) {
        return;
    }

    if (data.length > 200 || data.length < 32) {
        return;
    }

    // 77 = 0x4d
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
        particles_10em,
        particles_25um,
        particles_50um,
        particles_100um,
        skip,
        checksum
    ] = frame;

    const check = data.slice(0, 30).reduce((a, b) => a + b);

    if (check !== checksum) {
        console.log('Checksum didn\'t match, skipping reading.')
    } else {
        console.log({
            pm10_standard,
            pm25_standard,
            pm100_standard,
            pm10_env,
            pm25_env,
            pm100_env,
            particles_3um,
            particles_5um,
            particles_10em,
            particles_25um,
            particles_50um,
            particles_100um,
        });
    }
});
