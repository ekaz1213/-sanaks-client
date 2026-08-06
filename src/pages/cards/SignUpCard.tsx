import {createSignal, JSX, onMount} from 'solid-js';

import Button from '@components/buttonTsx';
import Icon from '@components/icon';
import InputField from '@components/inputField';
import PopupElement from '@components/popups';
import PopupAvatar from '@components/popups/avatar';
import MediaHeader from '@components/mediaHeader';
import blurActiveElement from '@helpers/dom/blurActiveElement';
import type {CancellablePromise} from '@helpers/cancellablePromise';
import type {InputFile} from '@layer';
import {LangPackKey, i18n} from '@lib/langPack';
import wrapEmojiText from '@lib/richTextProcessor/wrapEmojiText';

import AuthCard from '@/pages/AuthCard';
import {CardSpec, useAuthFlow} from '@/pages/authFlow';
import {sendCsanaksAuthRequest} from '@/pages/csanaksAuth';
import styles from '@/pages/authFlow.module.scss';

if(import.meta.hot) import.meta.hot.accept();

type Spec = Extract<CardSpec, {name: 'signUp'}>;

/**
 * Card variant of `pageSignUp`. Avatar uploader (canvas + camera-add icon)
 * and two name inputs. The card title doubles as a live preview of the
 * entered full name.
 */
export default function SignUpCard(props: {spec: Spec}) {
  const {managers, toIm} = useAuthFlow();

  /* ---------- state ---------- */

  const [submitting, setSubmitting] = createSignal(false);
  const [signUpKey, setSignUpKey] = createSignal<LangPackKey>('StartMessaging');
  const [error, setError] = createSignal('');

  /* ---------- avatar (sticker slot) ---------- */

  const avatarPreview = document.createElement('canvas');
  avatarPreview.id = 'canvas-avatar';
  avatarPreview.className = 'avatar-edit-canvas';

  const addIco = Icon('cameraadd', 'avatar-edit-icon');

  const avatarContainer = document.createElement('div');
  avatarContainer.classList.add('avatar-edit');
  avatarContainer.append(avatarPreview, addIco);
  avatarContainer.addEventListener('click', () => {
    PopupElement.createPopup(PopupAvatar).open(avatarPreview, (_uploadAvatar) => {
      uploadAvatar = _uploadAvatar;
    });
  });

  let uploadAvatar: (() => CancellablePromise<InputFile>) | undefined;

  /* ---------- inputs ---------- */

  const loginInputField = new InputField({
    labelText: 'Логин',
    maxLength: 70,
    plainText: true,
    autocomplete: 'username'
  });

  const passwordInputField = new InputField({
    labelText: 'Пароль',
    maxLength: 64,
    plainText: true,
    autocomplete: 'new-password'
  });

  /* ---------- live full-name preview (drives MediaHeader.Title) ---------- */

  const [titleContent, setTitleContent] = createSignal<JSX.Element>(i18n('YourName'));

  function handleNameInput() {
    const name = loginInputField.value || '';
    const lastName = passwordInputField.value || '';

    const fullName = (name || lastName) ? (name + ' ' + lastName).trim() : '';

    setTitleContent(fullName ? wrapEmojiText(fullName) : i18n('YourName'));
  }

  loginInputField.input.addEventListener('input', handleNameInput);
  passwordInputField.input.addEventListener('input', handleNameInput);

  /* ---------- submit ---------- */

  function sendAvatar() {
    return new Promise<void>((resolve, reject) => {
      if(!uploadAvatar) return resolve();

      uploadAvatar().then((inputFile) => {
        managers.appProfileManager.uploadProfilePhoto(inputFile).then(resolve, reject);
      }, reject);
    });
  }

  async function onSubmit() {
    if(loginInputField.input.classList.contains('error') || passwordInputField.input.classList.contains('error')) {
      return;
    }

    if(!loginInputField.value.trim().length || !passwordInputField.value.length) {
      setError('Введите логин и пароль');
      return;
    }

    setSubmitting(true);
    setError('');
    setSignUpKey('PleaseWait');

    try {
      const response = await sendCsanaksAuthRequest({
        type: 'AUTH_REGISTER',
        login: loginInputField.value.trim(),
        password: passwordInputField.value
      });

      if(response.type === 'AUTH_SUCCESS' || response.type === 'AUTH_REGISTER_SUCCESS') {
        await toIm();
        return;
      }

      setError(response.message || response.error || 'Ошибка регистрации');
      setSignUpKey('StartMessaging');
    } catch(err: any) {
      setError(err?.message || 'Сервер недоступен');
      setSignUpKey('StartMessaging');
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------- lifecycle ---------- */

  onMount(() => {
    managers.appStateManager.pushToState('authState', {
      _: 'authStateSignUp',
      authCode: props.spec.payload
    });

    blurActiveElement();
  });

  return (
    <AuthCard
      class={styles.pageSignUp}
      header={
        <MediaHeader>
          <MediaHeader.Sticker element={avatarContainer} size={120}/>
          <MediaHeader.Title>Csanaks Register</MediaHeader.Title>
          <MediaHeader.Subtitle>Создайте учетную запись Csanaks.</MediaHeader.Subtitle>
        </MediaHeader>
      }
    >
      {loginInputField.container}
      {passwordInputField.container}
      {error() && <div class={styles.errorLabel}>{error()}</div>}
      <Button
        class="btn-primary btn-color-primary"
        disabled={submitting()}
        onClick={onSubmit}
      >
        {i18n(signUpKey())}
        {submitting() && (
          <svg xmlns="http://www.w3.org/2000/svg" class="preloader-circular" viewBox="25 25 50 50">
            <circle class="preloader-path" cx="50" cy="50" r="20" fill="none" stroke-miterlimit="10"/>
          </svg>
        )}
      </Button>
    </AuthCard>
  );
}
