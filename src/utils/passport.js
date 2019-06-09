const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { DynamoDB } = require('aws-sdk');
const client = new DynamoDB.DocumentClient({ region: 'us-east-1' });

// serialize email to a cookie
passport.serializeUser((user, done) => {
  done(null, user.emails[0].value);
});

// deserialize profile from DynamoDB
passport.deserializeUser(async (id, done) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME,
    Key: {
      user_id: id
    }
  };

  const data = await client.get(params).promise();
  done(null, data.Item);
});

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_OAUTH2_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH2_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    // save profile info to DynamoDB
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME,
      Key: {
        user_id: profile.emails[0].value
      }
    };

    const data = await client.get(params).promise();

    if (!data.Item) {
      delete params.Key;
      params.Item = {
        user_id: profile.emails[0].value,
        display_name: profile.displayName,
        first_name: profile.name.givenName,
        last_name: profile.name.familyName,
        photo: profile.photos[0].value
      };

      await client.put(params).promise();
    }

    return done(null, profile);
  }
));
