import "server-only";
import { StreamClient } from "@stream-io/node-sdk";

const apiKey = process.env.STREAM_VIDEO_API_KEY;
const secret = process.env.STREAM_VIDEO_SECRET_KEY;
export const comms = new StreamClient(apiKey!, secret!);