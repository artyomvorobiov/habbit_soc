import { useState } from 'react';

import { Button, Field, Input, Screen } from '@/components/ui';
import { useJoinByCode } from '@/lib/actions';
import { t } from '@/lib/i18n';

export default function JoinByCode() {
  const [code, setCode] = useState('');
  const join = useJoinByCode();
  return (
    <Screen>
      <Field label={t('enterCode')}>
        <Input
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          placeholder="AB12CD34"
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          maxLength={8}
          style={{ fontSize: 28, letterSpacing: 6, textAlign: 'center' }}
        />
      </Field>
      <Button title={t('join')} onPress={() => join.run(code, true)} loading={join.busy} disabled={code.length < 6} />
    </Screen>
  );
}
