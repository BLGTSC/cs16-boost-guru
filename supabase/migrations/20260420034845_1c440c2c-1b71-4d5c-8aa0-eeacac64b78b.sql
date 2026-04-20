-- Create preset admin user with email confirmed
DO $$
DECLARE
  admin_id uuid;
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM auth.users WHERE email = 'teascblg@gmail.com';

  IF existing_id IS NULL THEN
    admin_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      admin_id,
      'authenticated',
      'authenticated',
      'teascblg@gmail.com',
      crypt('123qwe123qweAA', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'teascblg@gmail.com', 'email_verified', true),
      'email',
      admin_id::text,
      now(), now(), now()
    );
  ELSE
    admin_id := existing_id;
  END IF;

  -- Ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (admin_id, 'teascblg@gmail.com', 'Admin')
  ON CONFLICT (id) DO NOTHING;
END $$;