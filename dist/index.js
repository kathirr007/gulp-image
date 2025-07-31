import through2 from "through2-concurrent";
import PluginError from "plugin-error";
import { Buffer } from "node:buffer";
import execBuffer from "exec-buffer";
import isPng from "is-png";
import isJpg from "is-jpg";
import isGif from "is-gif";
import isSvg from "is-svg";
import optipng from "optipng-bin";
import pngquant from "pngquant-bin";
import zopflipng from "zopflipng-bin";
import jpegRecompress from "jpeg-recompress-bin";
import mozjpeg from "mozjpeg";
import gifsicle from "gifsicle";
import { optimize } from "svgo";
import { round10 } from "round10";
import fancyLog from "fancy-log";
import colors from "ansi-colors";
import prettyBytes from "pretty-bytes";

//#region lib/optimize.js
function useOptipng(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"-i 1",
		"-strip all",
		"-fix",
		"-o7",
		"-force"
	];
	return execBuffer({
		input: buffer,
		bin: optipng,
		args: [
			...parameters,
			"-out",
			execBuffer.output,
			execBuffer.input
		]
	});
}
async function usePngquant(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"--speed=1",
		"--force",
		256
	];
	return execBuffer({
		input: buffer,
		bin: pngquant,
		args: [
			...parameters,
			"--output",
			execBuffer.output,
			execBuffer.input
		]
	});
}
async function useZopflipng(buffer, args) {
	const parameters = Array.isArray(args) ? args : [
		"-y",
		"--lossy_8bit",
		"--lossy_transparent"
	];
	return execBuffer({
		input: buffer,
		bin: zopflipng,
		args: [
			...parameters,
			execBuffer.input,
			execBuffer.output
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
	return execBuffer({
		input: buffer,
		bin: jpegRecompress,
		args: [
			...parameters,
			execBuffer.input,
			execBuffer.output
		]
	});
}
async function useMozjpeg(buffer, args) {
	const parameters = Array.isArray(args) ? args : ["-optimize", "-progressive"];
	return execBuffer({
		input: buffer,
		bin: mozjpeg,
		args: [
			...parameters,
			"-outfile",
			execBuffer.output,
			execBuffer.input
		]
	});
}
async function useGifsicle(buffer, args) {
	const parameters = Array.isArray(args) ? args : ["--optimize"];
	return execBuffer({
		input: buffer,
		bin: gifsicle,
		args: [
			...parameters,
			"--output",
			execBuffer.output,
			execBuffer.input
		]
	});
}
async function useSvgo(buffer, args) {
	const options = args !== null && typeof args === "object" ? args : {};
	const svgString = typeof buffer === "string" ? buffer : buffer.toString("utf8");
	const result = optimize(svgString, options);
	return Buffer.from(result.data);
}
const optimize$1 = async (buffer, options) => {
	if (isJpg(buffer)) {
		if (options.jpegRecompress) buffer = await useJpegRecompress(buffer, options.jpegRecompress);
		if (options.mozjpeg) buffer = await useMozjpeg(buffer, options.mozjpeg);
	} else if (isPng(buffer)) {
		if (options.pngquant) buffer = await usePngquant(buffer, options.pngquant);
		if (options.optipng) buffer = await useOptipng(buffer, options.optipng);
		if (options.zopflipng) buffer = await useZopflipng(buffer, options.zopflipng);
	} else if (isGif(buffer) && options.gifsicle) buffer = await useGifsicle(buffer, options.gifsicle);
	else if (isSvg(buffer.toString()) && options.svgo) buffer = await useSvgo(buffer, options.svgo);
	return buffer;
};
var optimize_default = optimize$1;

//#endregion
//#region lib/log.js
const log = (filePath, originalBytes, optimizedBytes) => {
	const difference = originalBytes - optimizedBytes;
	const percent = round10(100 * (difference / originalBytes), -1);
	if (difference <= 0) fancyLog.info(colors.green("- ") + filePath + colors.gray(" ->") + colors.gray(" Cannot improve upon ") + colors.cyan(prettyBytes(originalBytes)));
	else fancyLog.info(colors.green("✔ ") + filePath + colors.gray(" ->") + colors.gray(" before=") + colors.yellow(prettyBytes(originalBytes)) + colors.gray(" after=") + colors.cyan(prettyBytes(optimizedBytes)) + colors.gray(" reduced=") + colors.green(`${prettyBytes(difference)} (${percent}%)`));
};
var log_default = log;

//#endregion
//#region index.js
const image = (options = {}) => through2.obj({ maxConcurrency: options.concurrent }, async (file, enc, callback) => {
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
		callback(new PluginError("gulp-image", error));
	}
});
var gulp_image_default = image;

//#endregion
export { gulp_image_default as default };