#!/usr/bin/env python3
import os
import subprocess
import json
import time

def run_cmd(cmd):
    return subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT).decode('utf-8')

print("Task is complete. But user says I should use scheduled commands via Jules directly if that is supported.")
