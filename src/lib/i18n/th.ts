import type { Messages } from "#lib/i18n/messages"

export const th: Messages = {
	site: {
		name: "เครื่องมือ Cookie Run",
		intro: "เครื่องมือเล็ก ๆ สำหรับสิ่งที่เกมไม่ได้จดไว้ให้ ทุกอย่างเก็บอยู่ในเบราว์เซอร์ของคุณ",
	},
	frame: { menu: "เมนู", nav: "เมนูหลัก", home: "หน้าแรก", settings: "ตั้งค่า", close: "ปิด", resize: "ปรับขนาดแผง" },
	tools: {
		"combi-name": {
			name: "โค้ดชื่อคอมโบ",
			title: "โค้ดคอมโบ Cookie Run",
			tagline: "เก็บการตั้งค่าการวิ่ง ทั้งโหมด ตอน บูสต์ บูสต์สุ่ม พลังคุกกี้+ และแอ็กชันเริ่มต้น ไว้ในชื่อคอมโบ 10 ตัวอักษร",
		},
	},
	settings: {
		title: "ตั้งค่า",
		appearance: "การแสดงผล",
		language: "ภาษา",
		theme: "ธีม",
		themes: { system: "ตามระบบ", dark: "มืด", light: "สว่าง" },
		about: "เกี่ยวกับ",
		rows: {
			environment: "สภาพแวดล้อม",
			built: "สร้างเมื่อ",
			source: "ซอร์สโค้ด",
			commit: "คอมมิต",
			changelog: "บันทึกการเปลี่ยนแปลง",
		},
		environments: { development: "ระหว่างพัฒนา", local: "บิลด์ในเครื่อง", preview: "พรีวิว", production: "ใช้งานจริง" },
		unknown: "ไม่ทราบ",
	},
}
