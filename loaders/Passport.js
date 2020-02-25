const passport = require( "passport" );
const GoogleStrategy = require( "passport-google-oauth20" ).Strategy;
const FacebookStrategy = require( "passport-facebook" ).Strategy;
const { googleConsumerKey, googleConsumerSecret, facebookAppId, facebookAppSecret } = require( "../config" );
const UserModel = require( "../models/users" );
const MongooseService = require( "../services/MongooseService" );
const User = new MongooseService( UserModel );

// Use the GoogleStrategy within Passport.
//   Strategies in passport require a `verify` function, which accept
//   credentials (in this case, a token, tokenSecret, and Google profile), and
//   invoke a callback with a user object.
const googleOptions = {
  clientID: googleConsumerKey,
  clientSecret: googleConsumerSecret,
  callbackURL: "/auth/google/redirect"
};

const facebookOptions = {
  clientID: facebookAppId,
  clientSecret: facebookAppSecret,
  callbackURL: "/auth/facebook/redirect"
};

passport.serializeUser( ( user, done ) => {
  done( null, user._id );
} );

passport.deserializeUser( ( id, done ) => {
  User.findById( id )
    .then( user => {
      done( null, user );
    } )
    .catch( err => console.error( err ) );
} );

passport.use( new GoogleStrategy( googleOptions,
  ( token, tokenSecret, profile, done ) => {
    const findQuery = { googleId: profile.id };

    // Check to see if user exists in DB
    User.findOne( findQuery )
      .then( currentUser => {
        if ( currentUser ) {
          done( null, currentUser );
        } else {
          const userData = {
            username: profile.displayName,
            googleId: profile.id
          };
          const user = new UserModel( userData );

          User.create( user )
            .then( newUser => {
              console.log( `New user created: ${newUser}` );
              done( null, newUser );
            } )
            .catch( err => console.error( err ) );
        }
      } )
      .catch( err => console.error( err ) );
  } ) );

passport.use( new FacebookStrategy( facebookOptions,
  ( token, refreshToken, profile, done ) => {
    const findQuery = {
      $or: [
        { facebookId: profile.id },
        { username: profile.displayName }
      ]
    };

    // Check to see if user exists in DB
    User.findOne( findQuery, { __v: 1 }, { lean: false } )
      .then( currentUser => {
        if ( currentUser ) {
          if ( !currentUser.facebookId ) {
            currentUser.facebookId = profile.id;
            currentUser.save().then( updatedUser => {
              done( null, updatedUser );
            } );
          } else {
            done( null, currentUser );
          }
        } else {
          const userData = {
            username: profile.displayName,
            googleId: profile.id
          };
          const user = new UserModel( userData );

          User.create( user )
            .then( newUser => {
              console.log( `New user created: ${newUser}` );
              done( null, newUser );
            } )
            .catch( err => console.error( err ) );
        }
      } )
      .catch( err => console.error( err ) );
  }
) );
