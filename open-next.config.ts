// OpenNext config — how Next.js gets packaged for AWS Lambda.
// See https://open-next.js.org/config.
//
// Defaults are fine for us: one server Lambda serves everything (SSR, API
// routes, streaming), assets go to S3. Our CDK stack reads .open-next/
// as the deploy artifact — see ../alpha-assist-infra/lib/alpha-assist-stack.ts.

import type { OpenNextConfig } from "open-next/types/open-next";

const config: OpenNextConfig = {
  default: {
    override: {
      // Lambda Function URLs support response streaming — cheaper than API GW
      // and required for AI SDK's chat streaming to work end-to-end.
      wrapper: "aws-lambda-streaming",
    },
  },
  buildCommand: "pnpm build",
};

export default config;
