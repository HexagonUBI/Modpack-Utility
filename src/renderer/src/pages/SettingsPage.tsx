import type { ReactNode } from 'react'
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material'
import CloseRounded from '@mui/icons-material/CloseRounded'
import CreateNewFolderRounded from '@mui/icons-material/CreateNewFolderRounded'
import FolderOpenRounded from '@mui/icons-material/FolderOpenRounded'
import HistoryRounded from '@mui/icons-material/HistoryRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import SystemUpdateAltRounded from '@mui/icons-material/SystemUpdateAltRounded'
import {
  LANGUAGES,
  type AccentName,
  type AppSettings,
  type DeleteMode,
  type ThemePreference,
  type UpdateStatus
} from '@shared/types'
import { formatDate } from '../format'
import { accentColour, type ThemeMode } from '../theme'
import { useT } from '../i18n'

interface SettingsPageProps {
  settings: AppSettings
  mode: ThemeMode
  appVersion: string
  updateStatus: UpdateStatus | null
  checkingUpdate: boolean
  onChange: (patch: Partial<AppSettings>) => void
  onAddFolder: () => void
  onReveal: (path: string) => void
  onCheckUpdates: () => void
  onShowUpdate: () => void
  onShowChangelog: () => void
}

const ACCENT_ORDER: AccentName[] = ['red', 'green', 'blue', 'violet', 'amber', 'slate']

export default function SettingsPage({
  settings,
  mode,
  appVersion,
  updateStatus,
  checkingUpdate,
  onChange,
  onAddFolder,
  onReveal,
  onCheckUpdates,
  onShowUpdate,
  onShowChangelog
}: SettingsPageProps) {
  const t = useT()
  const available = updateStatus?.available ?? null

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
                <Tooltip key={accent} title={t.accents[accent]}>
                  <Box
                    role="button"
                    aria-label={t.accents[accent]}
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
                {language.translated ? '' : ` (${t.settings.incompleteLanguage})`}
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
          <Stack spacing={1}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={settings.deleteMode}
              onChange={(_event, next: DeleteMode | null) => next && onChange({ deleteMode: next })}
            >
              <ToggleButton value="recycle">{t.settings.recycleBinOnly}</ToggleButton>
              <ToggleButton value="ask">{t.settings.alwaysAsk}</ToggleButton>
            </ToggleButtonGroup>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.settings.deleteModeDetail}
            </Typography>
          </Stack>
        </Section>

        <Section title={t.updates.title} detail={t.updates.detail}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t.updates.installedVersion}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'ui-monospace, monospace' }}>
                {appVersion}
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              sx={{ color: available ? 'primary.main' : 'text.secondary', fontWeight: available ? 600 : 400 }}
            >
              {checkingUpdate
                ? t.updates.checking
                : available
                  ? t.updates.available(available.version)
                  : updateStatus?.error
                    ? t.updates.errors[updateStatus.error]
                    : updateStatus?.checkedIso
                      ? t.updates.upToDate
                      : t.updates.neverChecked}
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
              <Button
                size="small"
                startIcon={
                  checkingUpdate ? <CircularProgress size={14} /> : <RefreshRounded />
                }
                disabled={checkingUpdate}
                onClick={onCheckUpdates}
              >
                {t.updates.checkNow}
              </Button>
              {available && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SystemUpdateAltRounded />}
                  onClick={onShowUpdate}
                >
                  {t.updates.dialogTitle(available.version)}
                </Button>
              )}
              <Button size="small" startIcon={<HistoryRounded />} onClick={onShowChangelog}>
                {t.updates.viewChangelog}
              </Button>
            </Stack>

            {updateStatus?.checkedIso && !checkingUpdate && (
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t.updates.lastChecked(formatDate(updateStatus.checkedIso, t))}
              </Typography>
            )}

            <Box>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={settings.autoCheckUpdates}
                    onChange={(event) => onChange({ autoCheckUpdates: event.target.checked })}
                  />
                }
                label={<Typography variant="body2">{t.updates.autoCheck}</Typography>}
              />
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                {t.updates.autoCheckDetail}
              </Typography>
            </Box>
          </Stack>
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
