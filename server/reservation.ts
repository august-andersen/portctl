import type { PortProcess, Reservation } from '../shared/types.js';
import { readConfig } from './config.js';
import { moveProcess } from './actions.js';

export function matchesReservation(process: PortProcess, reservation: Reservation): boolean {
  const { matcher } = reservation;

  switch (matcher.type) {
    case 'command_contains':
      return process.command.includes(matcher.value);
    case 'process_name':
      return process.name === matcher.value;
    case 'working_directory':
      return process.workingDirectory === matcher.value;
    case 'regex':
      try {
        return new RegExp(matcher.value).test(process.command);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export interface MigrationAction {
  type: 'migrate' | 'conflict' | 'blocked';
  process: PortProcess;
  reservation: Reservation;
  message: string;
  occupyingProcess?: PortProcess;
}

export function checkReservations(processes: PortProcess[]): MigrationAction[] {
  const config = readConfig();
  const actions: MigrationAction[] = [];

  for (const reservation of config.reservations) {
    // Find a process that matches this reservation
    const matchingProcess = processes.find(
      (p) => matchesReservation(p, reservation) && p.port !== reservation.port
    );

    if (!matchingProcess) continue;

    // Check if another reservation exists for the same port
    const conflictingReservation = config.reservations.find(
      (r) => r.port === reservation.port && r !== reservation
    );

    if (conflictingReservation) {
      actions.push({
        type: 'conflict',
        process: matchingProcess,
        reservation,
        message: `Reservation conflict: "${reservation.label}" and "${conflictingReservation.label}" both reserved for port ${reservation.port}`,
      });
      continue;
    }

    // Check if the reserved port is occupied
    const occupier = processes.find(
      (p) => p.port === reservation.port && !matchesReservation(p, reservation)
    );

    actions.push({
      type: 'migrate',
      process: matchingProcess,
      reservation,
      occupyingProcess: occupier,
      message: occupier
        ? `Will kill ${occupier.name} on port ${reservation.port} and move ${matchingProcess.name} to its reserved port`
        : `Moving ${matchingProcess.name} to reserved port ${reservation.port}`,
    });
  }

  return actions;
}

export async function executeMigrations(
  actions: MigrationAction[],
  onToast: (type: 'success' | 'error' | 'info', message: string) => void
): Promise<void> {
  for (const action of actions) {
    if (action.type !== 'migrate') {
      onToast('error', action.message);
      continue;
    }

    const { process: proc, reservation, occupyingProcess } = action;

    // Kill the occupying process if needed
    if (occupyingProcess) {
      const { killProcess } = await import('./actions.js');
      const killResult = await killProcess(occupyingProcess.pid);
      if (!killResult.success) {
        onToast('error', `Failed to free port ${reservation.port}: ${killResult.error}`);
        continue;
      }
      onToast('info', `Killed ${occupyingProcess.name} on port ${reservation.port}`);
    }

    // Get custom restart command if available
    const config = readConfig();
    const customCmd = config.customRestartCommands[`port:${reservation.port}`] ?? reservation.restartTemplate;

    // Move the process
    const result = await moveProcess(proc.pid, proc.port, reservation.port, customCmd ?? undefined);
    if (result.success) {
      onToast('success', `Moved ${proc.name} to reserved port ${reservation.port}`);
    } else {
      onToast('error', `Failed to move ${proc.name} to port ${reservation.port}: ${result.error}`);
    }
  }
}

export function checkBlockedPorts(
  processes: PortProcess[],
  onToast: (type: 'success' | 'error' | 'info', message: string) => void
): void {
  const config = readConfig();

  for (const port of config.blockedPorts) {
    const proc = processes.find((p) => p.port === port && !p.isPortctl);
    if (proc) {
      import('./actions.js').then(({ killProcess }) => {
        killProcess(proc.pid).then((result) => {
          if (result.success) {
            onToast('info', `Killed ${proc.name} on blocked port ${port}`);
          }
        });
      });
    }
  }
}
