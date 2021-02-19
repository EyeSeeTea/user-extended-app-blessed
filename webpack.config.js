"use strict";

var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");
var path = require("path");
var colors = require("colors");

const isDevBuild = process.argv[1].indexOf("webpack-dev-server") !== -1;
const dhisConfigPath = process.env.DHIS2_HOME
    ? `${process.env.DHIS2_HOME}/config`
    : `${__dirname}/config`;
var dhisConfig;

try {
    dhisConfig = require(dhisConfigPath);
    console.log("\nLoaded DHIS config:");
} catch (e) {
    // Failed to load config file - use default config
    console.warn(`\nWARNING! Failed to load DHIS config:`, e.message);
    console.info("Using default config");
    dhisConfig = {
        baseUrl: "http://localhost:8080",
        authorization: "Basic YWRtaW46ZGlzdHJpY3Q=", // admin:district
    };
}
console.log(JSON.stringify(dhisConfig, null, 2), "\n");

function bypass(req, res, opt) {
    req.headers.Authorization = dhisConfig.authorization;
    console.log(
        "[PROXY]".cyan.bold,
        req.method.green.bold,
        req.url.magenta,
        "=>".dim,
        opt.target.dim
    );
}

const webpackConfig = {
    context: __dirname,
    contentBase: __dirname,
    entry: "./src/app.js",
    devtool: "source-map",
    output: {
        path: __dirname + "/build",
        filename: "app.js",
        publicPath: isDevBuild ? "/" : "",
    },
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /node_modules/,
                loader: "babel",
                query: {
                    presets: ["es2015", "stage-0", "react"],
                },
            },
            {
                test: /\.css$/,
                loader: "style!css",
            },
            {
                test: /\.scss$/,
                loader: "style!css!sass",
            },
            {
                test: /\.(png|jp(e*)g|svg)$/,
                loader: "url-loader",
                options: {
                    limit: 8000, // Convert images < 8kb to base64 strings
                    name: "images/[hash]-[name].[ext]",
                },
            },
        ],
    },
    resolve: {
        alias: {
            react: path.resolve("./node_modules/react"),
            "material-ui": path.resolve("./node_modules/material-ui"),
            d2: path.resolve("./node_modules/d2"),
        },
    },
    devServer: {
        progress: true,
        colors: true,
        port: 8081,
        inline: true,
        compress: true,
        proxy: [
            { path: "/api/**", target: dhisConfig.baseUrl, bypass },
            { path: "/dhis-web-commons/**", target: dhisConfig.baseUrl, bypass },
            { path: "/dhis-web-core-resource/**", target: dhisConfig.baseUrl, bypass },
            { path: "/icons/**", target: dhisConfig.baseUrl, bypass },
            { path: "/i18n/**", target: "http://localhost:8081/src", bypass },
            {
                path: "/jquery.min.js",
                target: "http://localhost:8081/node_modules/jquery/dist",
                bypass,
            },
            {
                path: "/polyfill.min.js",
                target: "http://localhost:8081/node_modules/babel-polyfill/dist",
                bypass,
            },
        ],
    },
};

if (!isDevBuild) {
    webpackConfig.plugins = [
        // Replace any occurance of process.env.NODE_ENV with the string 'production'
        new webpack.DefinePlugin({
            "process.env.NODE_ENV": '"production"',
            DHIS_CONFIG: JSON.stringify({}),
        }),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.optimize.UglifyJsPlugin({
            //     compress: {
            //         warnings: false,
            //     },
            comments: false,
            beautify: true,
        }),
    ];
} else {
    webpackConfig.plugins = [
        new webpack.DefinePlugin({
            DHIS_CONFIG: JSON.stringify(dhisConfig),
        }),
    ];
}

// Generates an `index.html` file with the <script> injected.
webpackConfig.plugins.push(
    new HtmlWebpackPlugin({
        inject: true,
        template: "./index.html",
        vendorScripts: [
            `css/material-design-icons/material-icons.css`,
            `css/fonts/roboto.css`,
            `css/font-awesome/css/font-awesome.min.css`,
        ]
            .map(asset => {
                return /\.js$/.test(asset)
                    ? `<script src="${asset}"></script>`
                    : `<link type="text/css" rel="stylesheet" href="${asset}">`;
            })
            .join("\n"),
    })
);

module.exports = webpackConfig;
