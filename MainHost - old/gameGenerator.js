import shell from "shelljs";
import busboy from "busboy";
import fs from "fs";

export {buildDocker, startInstance}

var dynamicPort = 9000;

function buildDocker() {
    shell.exec(`docker build --tag node-chatipelago ../.`)
    shell.exec('docker volume create --name chatipelago-saved')
}

function createTempConfFile(filepath, req, callback)
{
    const bb = busboy({ headers: req.headers });
    bb.on('file', (name, file, info) => {
        file.on('data', (data) => {
            if (name === "filetoupload"){
                fs.writeFileSync(filepath, data, function (err) {});
            }
        }).on('close', () => {
        });
    });
    bb.on('field', (name, val, info) => {
    });
    bb.on('close', () => {
        callback();
    });

    req.pipe(bb);
}

function startInstance(req) {

    let newPort = dynamicPort;
    ++dynamicPort;

    let genId = crypto.randomUUID();
    let filename = `configCache/${genId}.chaticonfig`
    createTempConfFile(filename, req, function(){
        shell.pushd(`configCache/`);
        let fullpath = shell.pwd();
        shell.popd();
        console.log(`${fullpath}/${genId}.chaticonfig`);

        shell.exec(`docker run --publish ${newPort}:1337 `+
            `--detach `+
            `--volume chatipelago-saved:/app/saved `+
            `--env PUBLIC_PORT=${newPort} `+
            `--mount type=bind,source=${fullpath}/${genId}.chaticonfig,target=/app/config.chaticonfig,readonly `+
            `node-chatipelago`);
    });

    return newPort;
}