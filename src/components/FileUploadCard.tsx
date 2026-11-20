import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { strings } from '@/constants/strings';
import { useTheme } from '@/theme';
import { isPdf, validateUpload, type UploadedFile, type UploadValidationError } from '@/utils/uploadFile';
import AppText from './AppText';
import PhotoSourceSheet, { PICKER_ERROR_MESSAGES } from './PhotoSourceSheet';
import UploadBox from './UploadBox';

export type FileUploadCardProps = {
  /** Section label above the box, e.g. "Upload Vehicle RC". */
  label: string;
  /** Title inside the empty box, e.g. "Upload RC image". */
  title: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  testID: string;
  style?: StyleProp<ViewStyle>;
};

const u = strings.onboarding.upload;

const VALIDATION_MESSAGES: Record<UploadValidationError, string> = {
  unsupported_type: u.unsupportedType,
  too_large: u.tooLarge,
};

/**
 * Labelled upload card (design/onboarding steps 2–3): the dashed UploadBox (empty: icon, title,
 * "JPEG, PNG, PDF. Upto 10 MB", "Browse File"; filled: image preview or a PDF tile, round X).
 * "Browse File" opens Take photo / Choose from gallery / Choose file (PDF); anything picked is checked
 * for type (jpg/png/pdf) and size (≤ 10 MB) and rejected with an inline error.
 */
export default function FileUploadCard({ label, title, value, onChange, testID, style }: FileUploadCardProps) {
  const theme = useTheme();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  return (
    <View style={style} testID={testID}>
      <AppText variant="fieldLabel" color="text.onLight" style={styles.label}>
        {label}
      </AppText>
      <UploadBox
        testID={`${testID}-box`}
        uri={value?.uri ?? null}
        kind={value && isPdf(value) ? 'pdf' : 'image'}
        fileName={value?.name}
        fileSize={value?.size}
        title={title}
        hint={u.hint}
        browseLabel={u.browse}
        error={error}
        previewRadius={theme.radius.previewDocument}
        uploadA11yLabel={u.uploadA11y(label)}
        previewA11yLabel={u.previewA11y(label)}
        removeA11yLabel={u.removeA11y(label)}
        onPress={() => setSheetOpen(true)}
        onRemove={() => {
          setError(undefined);
          onChange(null);
        }}
      />
      <PhotoSourceSheet
        testID={`${testID}-source`}
        title={u.sheetTitle}
        includeDocument
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onError={reason => setError(PICKER_ERROR_MESSAGES[reason])}
        onPicked={picked => {
          const result = validateUpload(picked);
          if (result.ok) {
            setError(undefined);
            onChange(result.file);
          } else {
            setError(VALIDATION_MESSAGES[result.error]);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Same as step 1's "Upload your DL": label line box + 8 → box top 21.4pt below the cap height.
  label: { marginBottom: 8 },
});
