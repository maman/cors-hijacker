import type { NextApiRequest, NextApiResponse } from 'next';
import Cors from 'cors';
import http from "node:http";
import { hitSuccessCounter, hitErrorCounter } from "./_utils"

// Initializing the cors middleware
// You can read more about the available options here: https://github.com/expressjs/cors#configuration-options
const cors = Cors()

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(
  req: NextApiRequest,
  res: NextApiResponse,
  fn: Function
) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Run the middleware
  await runMiddleware(req, res, cors)
  const { url, } = req.query

  if (!url) {
    hitErrorCounter();
    res.status(500);
    console.error("[ERR_CODE]: 5001");
    res.json({
      success: false,
      error: 'ERROR: Query param "url" is required!',
      code: 5001,
    });
  }

  const headers = Object.assign({}, req.headers);
  delete headers.host;

  const targetURL = decodeURIComponent(url as string);
  const targetHeaders = {
    ...headers,
    referer: 'https://cors-hijacker.vercel.app/',
    'cache-control': 'no-cache',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.53 Safari/537.36 Edg/103.0.1264.37',
  }
  http[req.method.toLowerCase()]({
    headers: targetHeaders,
    href: targetURL,
  }, (forwardedRes => {
    hitSuccessCounter();
    const responseStatusCode = forwardedRes.statusCode;
    if (responseStatusCode > 201) {
      hitErrorCounter();
    } else {
      hitSuccessCounter();
    }
    res.writeHead(responseStatusCode);
    forwardedRes.pipe(res);
  }))
}
