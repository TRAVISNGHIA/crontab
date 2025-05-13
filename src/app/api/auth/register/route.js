import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "../../../../lib/db";
import User from "../../../../models/User";

export async function POST(request) {
    try {
        await connectDB();
        const { name, password } = await request.json();

        if (!name || !password) {
            return NextResponse.json(
                { error: "Tên và password là bắt buộc" },
                { status: 400 }
            );
        }

        const existingUser = await User.findOne({ name });
        if (existingUser) {
            return NextResponse.json(
                { error: "Tên đã được sử dụng" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            password: hashedPassword,
        });

        return NextResponse.json(
            {
                message: "Đăng ký thành công",
                user: { id: user._id, name: user.name },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Đã có lỗi xảy ra" },
            { status: 500 }
        );
    }
}