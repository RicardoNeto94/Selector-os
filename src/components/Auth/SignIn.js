'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import cn from 'classnames';
import { Field, Form, Formik } from 'formik';
import Link from 'next/link';
import * as Yup from 'yup';

const SignInSchema = Yup.object().shape({
  email: Yup.string().email('Invalid email').required('Required'),
  password: Yup.string().required('Required'),
});

const SignIn = () => {
  const supabase = createClientComponentClient();
  const [errorMsg, setErrorMsg] = useState(null);

  // Email/password sign-in
  const signIn = async ({ email, password }) => {
    setErrorMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
    } else {
      window.location.href = '/onboarding';
    }
  };

  // Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
  };

  return (
    <div className="card">
      <h2 className="w-full text-center">Sign In</h2>

      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={SignInSchema}
        onSubmit={signIn}
      >
        {({ errors, touched }) => (
          <Form className="column w-full">
            <label htmlFor="email">Email</label>
            <Field
              className={cn('input', errors.email && touched.email && 'bg-red-50')}
              id="email"
              name="email"
              placeholder="jane@acme.com"
              type="email"
            />
            {errors.email && touched.email && (
              <div className="text-red-600">{errors.email}</div>
            )}

            <label htmlFor="password">Password</label>
            <Field
              className={cn('input', errors.password && touched.password && 'bg-red-50')}
              id="password"
              name="password"
              type="password"
            />
            {errors.password && touched.password && (
              <div className="text-red-600">{errors.password}</div>
            )}

            <Link href="/reset-password" className="link w-full">
              Forgot your password?
            </Link>

            <button className="button-inverse w-full" type="submit">
              Submit
            </button>
          </Form>
        )}
      </Formik>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="button-inverse w-full mt-4"
      >
        Continue with Google
      </button>

      {errorMsg && <div className="text-red-600 mt-2">{errorMsg}</div>}

      <Link href="/sign-up" className="link w-full mt-2">
        Don&apos;t have an account? Sign Up.
      </Link>
    </div>
  );
};

export default SignIn;
