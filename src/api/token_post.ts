import { users } from "@clerk/clerk-sdk-node";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  generateToken,
  getClerkUser,
  getStripePriceId,
  headers,
} from "../lambda-helpers";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> =>
  getClerkUser(event).then(async (user) => {
    if (!user) {
      return {
        statusCode: 401,
        body: "No Active Session",
        headers: headers(event),
      };
    }

    const { service } = JSON.parse(event.body);
    const id = user.id;
    const publicMetadata = user.publicMetadata as {
      [key: string]: Record<string, unknown>;
    };
    if (!publicMetadata[service]?.token) {
      if (await getStripePriceId(service).catch(() => "Invalid")) {
        return {
          statusCode: 401,
          body: `Not authorized to generate a new token if there is no existing token for ${service}.`,
          headers: headers(event),
        };
      }
    }

    const token = generateToken(id);
    return users
      .updateUser(id, {
        publicMetadata: {
          ...publicMetadata,
          [service]: {
            ...publicMetadata[service],
            token,
          },
        },
      })
      .then(() => ({
        statusCode: 200,
        body: JSON.stringify({ token }),
        headers: headers(event),
      }));
  });
