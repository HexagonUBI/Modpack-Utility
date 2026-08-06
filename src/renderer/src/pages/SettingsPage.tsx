import type { ReactNode } from 'react'
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CreateNewFolderRounded from '@mui/icons-material/CreateNewFolderRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import {
  ACCENT_LABELS,
  LANGUAGES,
  type AccentName,
  type AppSettings,
  type ThemePreference
} from '@shared/types'
import { accentColour, type ThemeMode } from '../theme'
import { useT } from '../i18n'

interface SettingsPageProps {
  settings: AppSettings
  mode: ThemeMode
  onChange: (patch: Partial<AppSettings>) => void
  onAddFolder: () => void
  onReveal: (path: string) => void
}

const ACCENT_ORDER: AccentName[] = ['red', 'green', 'blue', 'violet', 'amber', 'slate']

export default function SettingsPage({
  settings,
  mode,
  onChange,
  onAddFolder,
  onReveal
}: SettingsPageProps) {
  const t = useT()

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', px: 4, py: 3 }}>
      <Stack spacing={3} sx={{ maxWidth: 720 }}>
        <Typography variant="h5">{t.settings.title}</Typography>

        <Section title={t.settings.theme} detail={t.settings.themeDetail}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={settings.theme}
            onChange={(_event, next: ThemePreference | null) => next && onChange({ theme: next })}
          >
            <ToggleButton value="system">{t.settings.followSystem}</ToggleButton>
            <ToggleButton value="light">{t.settings.light}</ToggleButton>
            <ToggleButton value="dark">{t.settings.dark}</ToggleButton>
          </ToggleButtonGroup>
        </Section>

        <Section title={t.settings.accent} detail={t.settings.accentDetail}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {ACCENT_ORDER.map((accent) => {
              const selected = settings.accent === accent
              return (
                <Tooltip key={accent} title={ACCENT_LABELS[accent]}>
                  <Box
                    role="button"
                    aria-label={ACCENT_LABELS[accent]}
                    aria-pressed={selected}
                    onClick={() => onChange({ accent })}
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1,
                      cursor: 'pointer',
                      backgroundColor: accentColour(accent, mode),
                      outline: selected ? '2px solid' : '1px solid',
                      outlineColor: selected ? 'text.primary' : 'divider',
                      outlineOffset: 2
                    }}
                  />
                </Tooltip>
              )
            })}
          </Stack>
        </Section>

        <Section title={t.settings.language} detail={t.settings.languageDetail}>
          <Select
            size="small"
            value={settings.language}
            onChange={(event) => onChange({ language: event.target.value })}
            sx={{ minWidth: 220 }}
          >
            {LANGUAGES.map((language) => (
              <MenuItem key={language.code} value={language.code}>
                {language.label}
                {language.translated ? '' : ' (incomplete)'}
              </MenuItem>
            ))}
          </Select>
        </Section>

        <Section title={t.settings.extraFolders} detail={t.settings.extraFoldersDetail}>
          <Stack spacing={1}>
            {settings.extraFolders.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.settings.noExtraFolders}
              </Typography>
            ) : (
              settings.extraFolders.map((folder) => (
                <Stack
                  key={folder}
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    pl: 1.5,
                    pr: 0.5,
                    py: 0.5
                  }}
                >
                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ flex: 1, minWidth: 0, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}
                  >
                    {folder}
                  </Typography>
                  <Tooltip title={t.common.showInFolder}>
                    <IconButton size="small" onClick={() => onReveal(folder)}>
                      <FolderOpenRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t.settings.stopScanning}>
                    <IconButton
                      size="small"
                      onClick={() =>
                        onChange({
                          extraFolders: settings.extraFolders.filter((entry) => entry !== folder)
                        })
                      }
                    >
                      <CloseRounded fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              ))
            )}

            <Box>
              <Button size="small" startIcon={<CreateNewFolderRounded />} onClick={onAddFolder}>
                {t.nav.addFolder}
              </Button>
            </Box>
          </Stack>
        </Section>

        <Section title={t.settings.deleting} detail={t.settings.deletingDetail}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t.settings.recycleBinOnly}
          </Typography>
        </Section>
      </Stack>
    </Box>
  )
}

interface SectionProps {
  title: string
  detail: string
  children: ReactNode
}

function Section({ title, detail, children }: SectionProps) {
  return (
    <Stack spacing={1.25}>
      <Box>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {detail}
        </Typography>
      </Box>
      {children}
    </Stack>
  )
}
