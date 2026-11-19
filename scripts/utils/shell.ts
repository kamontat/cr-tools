import { spawn } from "node:child_process"
import { exit } from "node:process"
import { styleText } from "node:util"

const printCmd = (cmd: string, arg: string) => {
	const prefix = styleText(["dim", "cyan"], "$")
	const msg = styleText(["dim", "gray"], `${cmd} ${arg}`)
	console.log(`${prefix} ${msg}`)
}

export const execAsync = async (cmd: string, ...args: string[]) => {
	printCmd(cmd, args.join(" "))

	const exitCode = await new Promise<number>((resolve) => {
		spawn(cmd, args, { stdio: "inherit" })
			.on("error", () => resolve(1))
			.on("close", (code) => resolve(code ?? 1))
	})
	exit(exitCode)
}
