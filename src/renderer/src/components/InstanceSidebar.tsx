import { useMemo, useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  LinearProgress,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material'
import CreateNewFolderRounded from '@mui/icons-material/CreateNewFolderRounded'
import DarkModeRounded from '@mui/icons-material/DarkModeRounded'
import LightModeRounded from '@mui/icons-material/LightModeRounded'
import RefreshRounded from '@mui/icons-material/RefreshRounded'
import SearchRounded from '@mui/icons-material/SearchRounded'
import SettingsRounded from '@mui/icons-material/SettingsRounded'
import SpaceDashboardRounded from '@mui/icons-material/SpaceDashboardRounded'
import ViewInArRounded from '@mui/icons-material/ViewInArRounded'
import type { Instance, LauncherKind } from '@shared/types'
import type { ThemeMode } from '../theme'
import { useT, type Messages } from '../i18n'

const FOOTER_BUTTON = {
  minWidth: 0,
  px: 1,
  lineHeight: 1.25,
  textAlign: 'left',
  '& .MuiButton-startIcon': { flexShrink: 0, mr: 0.75 }
} as const

interface InstanceSidebarProps {
  instances: Instance[]
  selectedId: string | null

  view: 'home' | 'instance' | 'settings'
  scanning: boolean
  mode: ThemeMode
  onSelect: (instance: Instance) => void
  onHome: () => void
  onSettings: () => void
  onRescan: () => void
  onAddFolder: () => void
  onToggleMode: () => void

  measureProgress: number | null
}

export default function InstanceSidebar({
  instances,
  selectedId,
  view,
  scanning,
  mode,
  onSelect,
  onHome,
  onSettings,
  onRescan,
  onAddFolder,
  onToggleMode,
  measureProgress
}: InstanceSidebarProps) {
  const t = useT()
  const [query, setQuery] = useState('')

  const groups = useMemo(() => groupByLauncher(instances, query, t), [instances, query, t])

  return (
    <Stack
      sx={{
        width: 320,
        flexShrink: 0,
        height: '100%',
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper'
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, pt: 2, pb: 1.5 }}>
        <ViewInArRounded sx={{ color: 'primary.main' }} />
        <Typography variant="h6" sx={{ flex: 1 }}>
          {t.appName}
        </Typography>
        <Tooltip title={mode === 'dark' ? t.nav.lightTheme : t.nav.darkTheme}>
          <IconButton
            size="small"
            aria-label={mode === 'dark' ? t.nav.lightTheme : t.nav.darkTheme}
            onClick={onToggleMode}
          >
            {mode === 'dark' ? <LightModeRounded fontSize="small" /> : <DarkModeRounded fontSize="small" />}
          </IconButton>
        </Tooltip>
      </Stack>

      <Box sx={{ px: 1, pb: 1 }}>
        <ListItemButton
          selected={view === 'home'}
          onClick={onHome}
          sx={{
            borderRadius: 1,
            px: 1.5,
            position: 'relative',
            overflow: 'hidden',

            ...(view === 'home' && { color: 'primary.main' })
          }}
        >
          <SpaceDashboardRounded
            fontSize="small"
            sx={{ mr: 1.5, color: view === 'home' ? 'inherit' : 'text.secondary' }}
          />
          <ListItemText
            primary={t.nav.overview}
            slotProps={{ primary: { variant: 'body2', sx: { fontWeight: 600 } } }}
          />

          {}
          {measureProgress !== null && (
            <LinearProgress
              variant={measureProgress > 0 ? 'determinate' : 'indeterminate'}
              value={Math.round(measureProgress * 100)}
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 3,
                borderRadius: 0
              }}
            />
          )}
        </ListItemButton>
      </Box>

      <Box sx={{ px: 2, pb: 1.5 }}>
        <TextField
          fullWidth
          size="small"
          placeholder={t.nav.searchInstances}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded fontSize="small" />
                </InputAdornment>
              )
            }
          }}
        />
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {scanning && instances.length === 0 && (
          <Stack spacing={1.5} sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t.nav.lookingForInstances}
            </Typography>
          </Stack>
        )}

        {!scanning && instances.length === 0 && (
          <Stack spacing={1} sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t.nav.noInstances}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t.nav.noInstancesHint}
            </Typography>
          </Stack>
        )}

        {groups.map(([launcher, items]) => (
          <Box key={launcher}>
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                px: 2,
                pt: 2,
                pb: 0.5,
                color: 'text.secondary',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              {t.launchers[launcher]} - {items.length}
            </Typography>
            <List dense disablePadding>
              {items.map((instance) => (
                <ListItemButton
                  key={instance.id}
                  selected={instance.id === selectedId}
                  onClick={() => onSelect(instance)}
                  sx={{ px: 2 }}
                >
                  <ListItemAvatar sx={{ minWidth: 46 }}>
                    <Avatar
                      variant="rounded"
                      src={instance.iconDataUrl ?? undefined}
                      sx={{ width: 34, height: 34, bgcolor: 'action.selected', color: 'text.primary' }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {initials(instance.name)}
                      </Typography>
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={instance.name}
                    secondary={subtitle(instance, t)}
                    slotProps={{
                      primary: { noWrap: true, variant: 'body2', sx: { fontWeight: 600 } },
                      secondary: { noWrap: true, variant: 'caption' }
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider />

      <Stack direction="row" spacing={0.5} sx={{ p: 1.5, alignItems: 'center' }}>
        <Button
          fullWidth
          size="small"
          startIcon={scanning ? <CircularProgress size={14} /> : <RefreshRounded />}
          onClick={onRescan}
          disabled={scanning}
          sx={FOOTER_BUTTON}
        >
          {t.nav.rescan}
        </Button>
        <Button
          fullWidth
          size="small"
          startIcon={<CreateNewFolderRounded />}
          onClick={onAddFolder}
          sx={FOOTER_BUTTON}
        >
          {t.nav.addFolder}
        </Button>
        <Tooltip title={t.nav.settings}>
          <IconButton
            size="small"
            aria-label={t.nav.settings}
            onClick={onSettings}
            color={view === 'settings' ? 'primary' : 'default'}
          >
            <SettingsRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Stack>
  )
}

function groupByLauncher(
  instances: Instance[],
  query: string,
  t: Messages
): Array<[LauncherKind, Instance[]]> {
  const needle = query.trim().toLowerCase()
  const filtered =
    needle === ''
      ? instances
      : instances.filter(
          (instance) =>
            instance.name.toLowerCase().includes(needle) ||
            (instance.minecraftVersion ?? '').toLowerCase().includes(needle) ||
            t.launchers[instance.launcher].toLowerCase().includes(needle)
        )

  const groups = new Map<LauncherKind, Instance[]>()
  for (const instance of filtered) {
    const bucket = groups.get(instance.launcher) ?? []
    bucket.push(instance)
    groups.set(instance.launcher, bucket)
  }

  return [...groups.entries()].sort((a, b) =>
    t.launchers[a[0]].localeCompare(t.launchers[b[0]])
  )
}

function subtitle(instance: Instance, t: Messages): string {
  const loader =
    instance.loader && instance.loader !== 'unknown' ? t.loaders[instance.loader] : null
  const parts = [instance.minecraftVersion, loader].filter(Boolean)
  return parts.length > 0 ? parts.join(' - ') : t.nav.versionUnknown
}

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase()
}
