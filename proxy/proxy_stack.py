from aws_cdk import (
    Stack,
    aws_lambda as lambda_,
)
from constructs import Construct

class ProxyStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, device_key: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        gtfs_layer = lambda_.LayerVersion(
            self, "GTFSLayer",
            compatible_runtimes=[lambda_.Runtime.NODEJS_24_X],
            compatible_architectures=[lambda_.Architecture.ARM_64],
            code=lambda_.Code.from_asset("lambda/layers/gtfs_layer.zip"),
        )

        fetch_mta_lambda = lambda_.Function(
            self, "FetchMta",
            runtime=lambda_.Runtime.NODEJS_24_X,
            architecture=lambda_.Architecture.ARM_64,
            handler="fetch_mta.lambda_handler",
            code=lambda_.Code.from_asset("lambda/functions/fetch_mta"),
            layers=[gtfs_layer],
            environment={"DEVICE_KEY": device_key}
        )

        fetch_mta_lambda.add_function_url(
            auth_type=lambda_.FunctionUrlAuthType.NONE,
        )
