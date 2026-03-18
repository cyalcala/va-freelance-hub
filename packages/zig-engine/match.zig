const std = @import("std");

/// Normalized string comparison (strips common suffixes)
fn normalize(allocator: std.mem.Allocator, input: []const u8) ![]u8 {
    var out = try allocator.dupe(u8, input);
    // Lowercase
    for (out) |*c| {
        c.* = std.ascii.toLower(c.*);
    }
    
    // Simple suffix stripping (Inc, Corp, VA, Philippines)
    const suffixes = [_][]const u8{ " inc", " corp", " ltd", " va", " philippines", " ph" };
    for (suffixes) |suffix| {
        if (std.mem.endsWith(u8, out, suffix)) {
            out = out[0 .. out.len - suffix.len];
        }
    }
    return std.mem.trim(u8, out, " ");
}

pub fn levenshtein(allocator: std.mem.Allocator, s1_raw: []const u8, s2_raw: []const u8) !usize {
    const s1 = try normalize(allocator, s1_raw);
    const s2 = try normalize(allocator, s2_raw);

    const len1 = s1.len;
    const len2 = s2.len;

    if (len1 == 0) return len2;
    if (len2 == 0) return len1;

    var matrix = try allocator.alloc(usize, (len1 + 1) * (len2 + 1));
    defer allocator.free(matrix);

    for (0..len1 + 1) |i| matrix[i * (len2 + 1)] = i;
    for (0..len2 + 1) |j| matrix[j] = j;

    for (1..len1 + 1) |i| {
        for (1..len2 + 1) |j| {
            const cost: usize = if (s1[i - 1] == s2[j - 1]) 0 else 1;
            const substitution = matrix[(i - 1) * (len2 + 1) + (j - 1)] + cost;
            const insertion = matrix[i * (len2 + 1) + (j - 1)] + 1;
            const deletion = matrix[(i - 1) * (len2 + 1) + j] + 1;

            matrix[i * (len2 + 1) + j] = @min(substitution, @min(insertion, deletion));
        }
    }

    return matrix[len1 * (len2 + 1) + len2];
}

pub fn similarity(allocator: std.mem.Allocator, s1: []const u8, s2: []const u8) !f64 {
    const distance = try levenshtein(allocator, s1, s2);
    const max_len = @max(s1.len, s2.len);
    if (max_len == 0) return 1.0;
    return 1.0 - (@as(f64, @floatFromInt(distance)) / @as(f64, @floatFromInt(max_len)));
}

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    const allocator = gpa.allocator();
    defer _ = gpa.deinit();

    const args = try std.process.argsAlloc(allocator);
    defer std.process.argsFree(allocator, args);

    if (args.len < 3) return;

    const score = try similarity(allocator, args[1], args[2]);
    std.debug.print("{d:.4}\n", .{score});
}
