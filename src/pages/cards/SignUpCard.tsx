import {createSignal, onCleanup, onMount} from 'solid-js';

import Button from '@components/buttonTsx';
import InputField from '@components/inputField';
import PasswordInputField from '@components/passwordInputField';
import MediaHeader from '@components/mediaHeader';
import IS_TOUCH_SUPPORTED from '@environment/touchSupport';
import cancelEvent from '@helpers/dom/cancelEvent';
import focusWhenConnected from '@helpers/dom/focusWhenConnected';

import AuthCard from '@/pages/AuthCard';
import {CardSpec, useAuthFlow} from '@/pages/authFlow';
import {sendCsanaksAuthRequest} from '@/pages/csanaksAuth';
import styles from '@/pages/authFlow.module.scss';

if(import.meta.hot) import.meta.hot.accept();

type Spec = Extract<CardSpec, {name: 'signUp'}>;

export default function SignUpCard(_props: {spec: Spec}) {
  const {managers, toIm} = useAuthFlow();

  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal('');

  const loginField = new InputField({
    labelText: 'Логин',
    name: 'login',
    plainText: true,
    autocomplete: 'username'
  });
  const passwordField = new PasswordInputField({
    labelText: 'Пароль',
    name: 'password',
    plainText: true,
    autocomplete: 'new-password'
  });

  const loginInput = loginField.input as HTMLInputElement;
  const passwordInput = passwordField.input as HTMLInputElement;

  function hasValidInput(): boolean {
    return loginInput.value.trim().length > 0 && passwordInput.value.length > 0;
  }

  async function performAuth(type: 'AUTH_LOGIN' | 'AUTH_REGISTER'): Promise<void> {
    if(!hasValidInput()) {
      setError('Введите логин и пароль');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await sendCsanaksAuthRequest({
        type,
        login: loginInput.value.trim(),
        password: passwordInput.value
      });

      if(response.type === 'AUTH_SUCCESS' || response.type === 'AUTH_REGISTER_SUCCESS') {
        await toIm();
        return;
      }

      const message = response.message || response.error || 'Ошибка авторизации';
      setError(message);
    } catch(err: any) {
      setError(err?.message || 'Сервер недоступен');
    } finally {
      setSubmitting(false);
    }
  }

  function onRegister(e?: Event) {
    if(e) cancelEvent(e);
    performAuth('AUTH_REGISTER');
  }

  function onKeyPress(e: KeyboardEvent) {
    if(e.key === 'Enter' && hasValidInput() && !submitting()) {
      onRegister();
    }
  }

  let cancelFocus: (() => void) | undefined;
  onMount(() => {
    managers.appStateManager.pushToState('authState', {_: 'authStateSignUp'});

    loginInput.addEventListener('keypress', onKeyPress);
    passwordInput.addEventListener('keypress', onKeyPress);

    if(!IS_TOUCH_SUPPORTED) {
      cancelFocus = focusWhenConnected(loginInput, () => !submitting());
    }
  });

  onCleanup(() => {
    cancelFocus?.();
  });

  return (
    <AuthCard
      class={styles.pageSignUp}
      header={
        <MediaHeader>
          <MediaHeader.Sticker
            class={styles.logoContainer}
            size={120}
            element={
              <svg class={styles.logo} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
                <use href="#logo" />
              </svg>
            }
          />
          <MediaHeader.Title>Csanaks Register</MediaHeader.Title>
          <MediaHeader.Subtitle class="secondary">
            Создайте учетную запись в Csanaks.
          </MediaHeader.Subtitle>
        </MediaHeader>
      }
    >
      {loginField.container}
      {passwordField.container}
      {error() && <div class={styles.errorLabel}>{error()}</div>}
      <Button
        class="btn-primary btn-color-primary"
        disabled={!hasValidInput() || submitting()}
        onClick={onRegister}
      >
        {submitting() ? 'Регистрация...' : 'Зарегистрироваться'}
        {submitting() && (
          <svg xmlns="http://www.w3.org/2000/svg" class="preloader-circular" viewBox="25 25 50 50">
            <circle class="preloader-path" cx="50" cy="50" r="20" fill="none" stroke-miterlimit="10" />
          </svg>
        )}
      </Button>
    </AuthCard>
  );
}
