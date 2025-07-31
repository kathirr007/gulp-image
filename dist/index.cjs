//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const through2_concurrent = __toESM(require("through2-concurrent"));
const plugin_error = __toESM(require("plugin-error"));
const node_buffer = __toESM(require("node:buffer"));
const exec_buffer = __toESM(require("exec-buffer"));
const is_png = __toESM(require("is-png"));
const is_jpg = __toESM(require("is-jpg"));
const is_gif = __toESM(require("is-gif"));
const is_svg = __toESM(require("is-svg"));
const optipng_bin = __toESM(require("optipng-bin"));
const pngquant_bin = __toESM(require("pngquant-bin"));
const zopflipng_bin = __toESM(require("zopflipng-bin"));
const jpeg_recompress_bin = __toESM(require("jpeg-recompress-bin"));
const mozjpeg = __toESM(require("mozjpeg"));
const gifsicle = __toESM(require("gifsicle"));
const svgo = __toESM(require("svgo"));
const round10 = __toESM(require("round10"));
const fancy_log = __toESM(require("fancy-log"));
const ansi_colors = __toESM(require("ansi-colors"));
const pretty_bytes = __toESM(require("pretty-bytes"));

//#region lib/optimize.js
function useOptipng(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"-i 1",
		"-strip all",
		"-fix",
		"-o7",
		"-force"
	];
	return (0, exec_buffer.default)({
		input: buffer,
		bin: optipng_bin.default,
		args: [
			...parameters,
			"-out",
			exec_buffer.default.output,
			exec_buffer.default.input
		]
	});
}
async function usePngquant(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"--speed=1",
		"--force",
		256
	];
	return (0, exec_buffer.default)({
		input: buffer,
		bin: pngquant_bin.default,
		args: [
			...parameters,
			"--output",
			exec_buffer.default.output,
			exec_buffer.default.input
		]
	});
}
async function useZopflipng(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"-y",
		"--lossy_8bit",
		"--lossy_transparent"
	];
	return (0, exec_buffer.default)({
		input: buffer,
		bin: zopflipng_bin.default,
		args: [
			...parameters,
			exec_buffer.default.input,
			exec_buffer.default.output
		]
	});
}
async function useJpegRecompress(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"--strip",
		"--quality",
		"medium",
		"--min",
		40,
		"--max",
		80
	];
	return (0, exec_buffer.default)({
		input: buffer,
		bin: jpeg_recompress_bin.default,
		args: [
			...parameters,
			exec_buffer.default.input,
			exec_buffer.default.output
		]
	});
}
async function useMozjpeg(buffer, args) {
	const parameters = Array.isArray(args) ? args : ["-optimize", "-progressive"];
	return (0, exec_buffer.default)({
		input: buffer,
		bin: mozjpeg.default,
		args: [
			...parameters,
			"-outfile",
			exec_buffer.default.output,
			exec_buffer.default.input
		]
	});
}
async function useGifsicle(buffer, args) {
	const parameters = Array.isArray(args) ? args : ["--optimize"];
	return (0, exec_buffer.default)({
		input: buffer,
		bin: gifsicle.default,
		args: [
			...parameters,
			"--output",
			exec_buffer.default.output,
			exec_buffer.default.input
		]
	});
}
async function useSvgo(buffer, args) {
	const options = args !== null && typeof args === "object" ? args : {};
	const svgString = typeof buffer === "string" ? buffer : buffer.toString("utf8");
	const result = (0, svgo.optimize)(svgString, options);
	return node_buffer.Buffer.from(result.data);
}
const optimize = async (buffer, options) => {
	if ((0, is_jpg.default)(buffer)) {
		if (options.jpegRecompress) buffer = await useJpegRecompress(buffer, options.jpegRecompress);
		if (options.mozjpeg) buffer = await useMozjpeg(buffer, options.mozjpeg);
	} else if ((0, is_png.default)(buffer)) {
		if (options.pngquant) buffer = await usePngquant(buffer, options.pngquant);
		if (options.optipng) buffer = await useOptipng(buffer, options.optipng);
		if (options.zopflipng) buffer = await useZopflipng(buffer, options.zopflipng);
	} else if ((0, is_gif.default)(buffer) && options.gifsicle) buffer = await useGifsicle(buffer, options.gifsicle);
	else if ((0, is_svg.default)(buffer.toString()) && options.svgo) buffer = await useSvgo(buffer, options.svgo);
	return buffer;
};
var optimize_default = optimize;

//#endregion
//#region lib/log.js
const log = (filePath, originalBytes, optimizedBytes) => {
	const difference = originalBytes - optimizedBytes;
	const percent = (0, round10.round10)(100 * (difference / originalBytes), -1);
	if (difference <= 0) fancy_log.default.info(ansi_colors.default.green("- ") + filePath + ansi_colors.default.gray(" ->") + ansi_colors.default.gray(" Cannot improve upon ") + ansi_colors.default.cyan((0, pretty_bytes.default)(originalBytes)));
	else fancy_log.default.info(ansi_colors.default.green("✔ ") + filePath + ansi_colors.default.gray(" ->") + ansi_colors.default.gray(" before=") + ansi_colors.default.yellow((0, pretty_bytes.default)(originalBytes)) + ansi_colors.default.gray(" after=") + ansi_colors.default.cyan((0, pretty_bytes.default)(optimizedBytes)) + ansi_colors.default.gray(" reduced=") + ansi_colors.default.green(`${(0, pretty_bytes.default)(difference)} (${percent}%)`));
};
var log_default = log;

//#endregion
//#region index.js
const image = (options = {}) => through2_concurrent.default.obj({ maxConcurrency: options.concurrent }, async (file, enc, callback) => {
	if (file.isNull()) return callback(null, file);
	if (file.isStream()) return callback(/* @__PURE__ */ new Error("gulp-image: Streaming is not supported"));
	try {
		const originalBuffer = file.contents;
		const optimizedBuffer = await optimize_default(originalBuffer, {
			pngquant: true,
			optipng: false,
			zopflipng: true,
			jpegRecompress: false,
			mozjpeg: true,
			gifsicle: true,
			svgo: true,
			...options
		});
		const originalBytes = originalBuffer.length;
		const optimizedBytes = optimizedBuffer.length;
		if (!options.quiet) log_default(file.relative, originalBytes, optimizedBytes);
		if (originalBytes - optimizedBytes > 0) file.contents = optimizedBuffer;
		callback(null, file);
	} catch (error) {
		callback(new plugin_error.default("gulp-image", error));
	}
});
var gulp_image_default = image;

//#endregion
module.exports = gulp_image_default;