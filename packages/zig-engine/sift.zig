const std = @import("std");

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 2) return;

    const input = args[1];
    var buffer: [4096]u8 = undefined;
    const lower = std.ascii.lowerString(&buffer, input);

    // Tier 4: Trash/Kill
    const kill_keywords = [_][]const u8{
        "portuguese", "spanish", "german", "french",
        "strictly us", "usa only", "us only", "americas only",
        "senior", "lead", "principal", "staff engineer", "architect",
        "manager", "vp", "director", "president", "head of",
    };

    for (kill_keywords) |k| {
        if (std.mem.indexOf(u8, lower, k) != null) {
            // Check for PH exemption
            if (std.mem.indexOf(u8, lower, "philippines") == null) {
                try std.io.getStdOut().writer().print("4\n", .{});
                return;
            }
        }
    }

    // Tier 1: Gold
    const gold_keywords = [_][]const u8{
        "philippines", "filipino", "pinoy", "tagalog",
        "virtual assistant", "va", "data entry", "bookkeeping",
        "admin", "customer service", "customer support",
    };

    for (gold_keywords) |g| {
        if (std.mem.indexOf(u8, lower, g) != null) {
            try std.io.getStdOut().writer().print("1\n", .{});
            return;
        }
    }

    // Tier 2: Silver
    const silver_keywords = [_][]const u8{ "worldwide", "global", "remote", "entry level" };
    for (silver_keywords) |s| {
        if (std.mem.indexOf(u8, lower, s) != null) {
            try std.io.getStdOut().writer().print("2\n", .{});
            return;
        }
    }

    // Tier 3: Bronze
    try std.io.getStdOut().writer().print("3\n", .{});
}
