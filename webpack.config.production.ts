import * as path from 'path';
import * as webpack from 'webpack';

const config: webpack.Configuration = {
    mode: 'production',
    entry: {
        main: path.resolve(__dirname, "src", "main.ts"),
        settings: path.resolve(__dirname, "src", "settings.ts"),
        popup: path.resolve(__dirname, "src", "popup.ts")
    },
    target: 'web',
    output: {
        path: path.resolve(__dirname, "extension"),
        filename: "[name].js",
    },
    module: {
        rules: [
            {
                test: [/\.ts$/, /\.tsx$/],
                loader: "ts-loader",
            },
        ],
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js", ".json"],
    }
}

module.exports = config