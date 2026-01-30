/**
 * AWS Cognito authentication service
 * Handles user registration, login, and token management
 */
import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  CognitoUserSession,
} from 'amazon-cognito-identity-js'
import config from '../config'

// Initialize Cognito User Pool
const userPool = new CognitoUserPool({
  UserPoolId: config.aws.userPoolId,
  ClientId: config.aws.clientId,
})

export interface SignUpParams {
  email: string
  password: string
}

export interface SignInParams {
  email: string
  password: string
}

export interface VerifyParams {
  email: string
  code: string
}

/**
 * Register a new user
 */
export const signUp = (params: SignUpParams): Promise<CognitoUser> => {
  const { email, password } = params

  const attributeList = [
    new CognitoUserAttribute({
      Name: 'email',
      Value: email,
    }),
  ]

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributeList, [], (err, result) => {
      if (err) {
        reject(err)
        return
      }
      if (result) {
        resolve(result.user)
      } else {
        reject(new Error('Sign up failed'))
      }
    })
  })
}

/**
 * Verify email with confirmation code
 */
export const confirmSignUp = (params: VerifyParams): Promise<string> => {
  const { email, code } = params

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  })

  return new Promise((resolve, reject) => {
    cognitoUser.confirmRegistration(code, true, (err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result)
    })
  })
}

/**
 * Resend verification code
 */
export const resendConfirmationCode = (email: string): Promise<string> => {
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  })

  return new Promise((resolve, reject) => {
    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        reject(err)
        return
      }
      resolve(result)
    })
  })
}

/**
 * Sign in a user
 */
export const signIn = (params: SignInParams): Promise<CognitoUserSession> => {
  const { email, password } = params

  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  })

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  })

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        resolve(session)
      },
      onFailure: (err) => {
        reject(err)
      },
      newPasswordRequired: () => {
        reject(new Error('New password required'))
      },
    })
  })
}

/**
 * Sign out the current user
 */
export const signOut = (): void => {
  const cognitoUser = userPool.getCurrentUser()
  if (cognitoUser) {
    cognitoUser.signOut()
  }
}

/**
 * Get the current authenticated user session
 */
export const getCurrentSession = (): Promise<CognitoUserSession | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser()

    if (!cognitoUser) {
      resolve(null)
      return
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null)
        return
      }
      resolve(session)
    })
  })
}

/**
 * Get the current ID token
 */
export const getIdToken = async (): Promise<string | null> => {
  const session = await getCurrentSession()
  if (!session) return null
  return session.getIdToken().getJwtToken()
}

/**
 * Get the current user info
 */
export const getCurrentUser = (): Promise<{ id: string; email: string } | null> => {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser()

    if (!cognitoUser) {
      resolve(null)
      return
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null)
        return
      }

      cognitoUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr || !attributes) {
          resolve(null)
          return
        }

        const email = attributes.find((attr) => attr.getName() === 'email')?.getValue() || ''
        const sub = attributes.find((attr) => attr.getName() === 'sub')?.getValue() || ''

        resolve({
          id: sub,
          email: email,
        })
      })
    })
  })
}

/**
 * Forgot password - initiate reset
 */
export const forgotPassword = (email: string): Promise<void> => {
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  })

  return new Promise((resolve, reject) => {
    cognitoUser.forgotPassword({
      onSuccess: () => {
        resolve()
      },
      onFailure: (err) => {
        reject(err)
      },
    })
  })
}

/**
 * Confirm forgot password with new password
 */
export const confirmForgotPassword = (
  email: string,
  code: string,
  newPassword: string
): Promise<void> => {
  const cognitoUser = new CognitoUser({
    Username: email,
    Pool: userPool,
  })

  return new Promise((resolve, reject) => {
    cognitoUser.confirmPassword(code, newPassword, {
      onSuccess: () => {
        resolve()
      },
      onFailure: (err) => {
        reject(err)
      },
    })
  })
}

export default {
  signUp,
  signIn,
  signOut,
  confirmSignUp,
  resendConfirmationCode,
  getCurrentSession,
  getIdToken,
  getCurrentUser,
  forgotPassword,
  confirmForgotPassword,
}

