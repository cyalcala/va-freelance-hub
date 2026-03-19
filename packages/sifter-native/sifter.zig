const std = @import("std");

// VA.INDEX TITANIUM SIEVE - Native Sifter Module
// Purpose: Multi-threaded, Zero-GC substring matching for job purity.

const SiftResult = enum(u8) {
    GOLD = 1,
    SILVER = 2,
    BRONZE = 3,
    TRASH = 4,
};

// Hard Kill Lists (Zero Tolerance)
const TECH_KILLS = [_][]const u8{
    "engineer", "developer", "software", "devops", "sre", "data scientist",
    "architect", "coder", "technical", "java", "python", "php", "rust", "golang",
};

const EXEC_KILLS = [_][]const u8{
    "ceo", "cto", "vp", "director", "president", "head of", "principal",
    "executive", "lead", "staff", "senior", "manager", "strategist", "researcher",
};

const CONTENT_KILLS = [_][]const u8{
    "reading this", "success story", "how to", "hiring tips", "interview with",
    "why it matters", "stability matters", "insiders", "blog", "guide to",
};

// Target Categories (Positive Signals)
const TARGET_SIGNALS = [_][]const u8{
    "virtual assistant", "va", "customer service", "admin", "design", "support",
    "sales", "marketing", "content", "writer", "moderator", "appointment setter",
};

export fn sift_job(title_ptr: [*c]const u8, company_ptr: [*c]const u8, desc_ptr: [*c]const u8) u8 {
    const title = std.mem.span(title_ptr);
    const company = std.mem.span(company_ptr);
    const desc = std.mem.span(desc_ptr);

    var buf: [2048]u8 = undefined;
    const lower_title = std.ascii.lowerString(&buf, title);
    
    // 1. HARD KILL CHECK (Tech/Exec)
    for (TECH_KILLS) |kill| {
        if (std.mem.indexOf(u8, lower_title, kill) != null) return @intFromEnum(SiftResult.TRASH);
    }
    for (EXEC_KILLS) |kill| {
        if (std.mem.indexOf(u8, lower_title, kill) != null) return @intFromEnum(SiftResult.TRASH);
    }
    for (CONTENT_KILLS) |kill| {
        if (std.mem.indexOf(u8, lower_title, kill) != null) return @intFromEnum(SiftResult.TRASH);
    }

    // 2. TARGET MATCHING
    var matches: u32 = 0;
    for (TARGET_SIGNALS) |signal| {
        if (std.mem.indexOf(u8, lower_title, signal) != null) {
            matches += 1;
        }
    }

    // 3. TIER DETERMINATION
    if (matches >= 1) return @intFromEnum(SiftResult.GOLD);
    
    // Fallback search in company/desc if needed (simplified for prototype)
    _ = company;
    _ = desc;

    return @intFromEnum(SiftResult.SILVER);
}
