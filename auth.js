const Router = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
require('dotenv').config();

/* Refer to this link to understand how json web tokens validate the tokens
    https://www.sohamkamani.com/blog/javascript/2019-03-29-node-jwt-authentication/

    Refer to this link to understand how routing middleware can be used to authenticate
    https://scotch.io/tutorials/route-middleware-to-check-if-a-user-is-authenticated-in-node-js
*/

const routes = new Router();

const JWT_SECRET = process.env.JWT_SECRET;

const uiServerOrigin = process.env.UI_SERVER_ORIGIN || 'http://localhost:3000';

routes.use(cors({ origin: uiServerOrigin, credentials: true }));
routes.use(bodyParser.json());

routes.post('/signin', async (req, res) => {
  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({ idToken: req.body.google_tokenId }).catch((e) => res.send(`Invalid Credentials: ${e}`));
  const tokenData = ticket.getPayload();
  const { given_name: givenName, name, email } = tokenData;
  const credentials = {
    signedIn: true,
    givenName,
    name,
    email,
  };
  const token = jwt.sign(credentials, JWT_SECRET);
  res.cookie('serverToken', token, { httpOnly: true,  domain: process.env.COOKIE_DOMAIN });
  res.json(credentials);
});

routes.post('/signout', async (req, res) => {
  res.clearCookie('serverToken', {
    domain: process.env.COOKIE_DOMAIN,
  });
  res.json({ status: 'ok' });
});

const validateAPIRequest = (req, res) => {
  const validatetoken = req.cookies.serverToken;
  try {
    const validatedCredentials = jwt.verify(validatetoken, JWT_SECRET);
    return validatedCredentials;
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError) {
      // if the error thrown is because the JWT is unauthorized, return a 401 error
      return res.status(401).json({ Message: 'Unauthorized Request, please login first to perform the operation' });
    }
    // otherwise, return a bad request error
    return res.status(400).json({ Message: 'Bad Request' });
  }
};

module.exports = { routes, validateAPIRequest };
