#!/usr/bin/env python3
import aws_cdk as cdk
from dotenv import load_dotenv
import os

from proxy.proxy_stack import ProxyStack

load_dotenv()
DEVICE_KEY = os.getenv("DEVICE_KEY")

app = cdk.App()
ProxyStack(
    app, "ProxyStack",
    device_key=DEVICE_KEY
)

app.synth()
