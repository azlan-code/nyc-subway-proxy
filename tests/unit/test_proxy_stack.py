import aws_cdk as core
import aws_cdk.assertions as assertions

from proxy.proxy_stack import ProxyStack

# example tests. To run these tests, uncomment this file along with the example
# resource in nyc_subway_proxy/nyc_subway_proxy_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = ProxyStack(app, "nyc-subway-proxy")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
